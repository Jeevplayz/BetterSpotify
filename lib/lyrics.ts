/*
 * Vencord, a modification for Discord's desktop app
 * GPL v3
 */

import type { PluginNative } from "@utils/types";

const LRCLIB_ROOT = "https://lrclib.net/api";

const Native = Object.values(VencordNative?.pluginHelpers ?? {})
    .find(helper => typeof helper?.fetchLyrics === "function") as PluginNative<typeof import("../native")> | undefined;

interface LyricsHttpResponse {
    ok: boolean;
    status: number;
    text: string;
}

/** Prefer main-process networking so LRCLIB works despite Discord renderer CORS/CSP restrictions. */
async function requestLyrics(url: string): Promise<LyricsHttpResponse> {
    if (typeof Native?.fetchLyrics === "function") return Native.fetchLyrics(url);

    const response = await fetch(url);
    return { ok: response.ok, status: response.status, text: await response.text() };
}

export interface LyricsLine {
    /** Line start time, in milliseconds. */
    time: number;
    text: string;
    /** Optional per-word timestamps from enhanced LRC. */
    words?: { time: number; text: string; }[];
}

export interface LyricsResult {
    /** Time-synced lines, or null if lrclib only has (or found) plain lyrics. */
    synced: LyricsLine[] | null;
    /** Plain, unsynced lyrics text, or null if none is available. */
    plain: string | null;
    /** True when lrclib reports this track as instrumental (no lyrics to show). */
    instrumental: boolean;
}

/** The subset of SpotifyStore's Track shape that lrclib needs to identify a song. */
export interface LookupTrack {
    name: string;
    duration: number;
    album?: { name: string; };
    artists: { name: string; }[];
}

const EMPTY_RESULT: LyricsResult = { synced: null, plain: null, instrumental: false };
const LYRICS_CACHE_TTL = 5 * 60_000;
const LYRICS_CACHE_MAX_ENTRIES = 32;
const lyricsCache = new Map<string, { expiresAt: number; promise: Promise<LyricsResult>; }>();

function timestampToMs(minutes: string, seconds: string, fraction?: string): number {
    const milliseconds = (fraction ?? "0").padEnd(3, "0").slice(0, 3);
    return (parseInt(minutes, 10) * 60 + parseInt(seconds, 10)) * 1000 + parseInt(milliseconds, 10);
}

/** Parses standard LRC line timestamps and Enhanced LRC per-word timestamps. */
function parseLRC(lrc: string): LyricsLine[] {
    const lineTimeTag = /\[(\d{2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
    const wordTimeTag = /<(\d{2}):(\d{2})(?:[.:](\d{1,3}))?>([^<]*)/g;
    const lines: LyricsLine[] = [];

    for (const raw of lrc.split("\n")) {
        const lineMatches = [...raw.matchAll(lineTimeTag)];
        if (!lineMatches.length) continue;

        const body = raw.replace(lineTimeTag, "").trim();
        const wordMatches = [...body.matchAll(wordTimeTag)];
        const words = wordMatches.length
            ? wordMatches.map(match => ({
                time: timestampToMs(match[1], match[2], match[3]),
                text: match[4].trim()
            })).filter(word => word.text.length > 0)
            : undefined;
        const text = words ? words.map(word => word.text).join(" ") : body;

        for (const match of lineMatches) {
            lines.push({
                time: timestampToMs(match[1], match[2], match[3]),
                text,
                ...(words ? { words } : {})
            });
        }
    }

    return lines.sort((a, b) => a.time - b.time);
}

function hasWordSync(result: LyricsResult | null | undefined): boolean {
    return Boolean(result?.synced?.some(line => line.words?.length));
}

function toResult(data: any): LyricsResult {
    if (!data) return EMPTY_RESULT;
    if (data.instrumental) return { synced: null, plain: null, instrumental: true };

    return {
        synced: data.syncedLyrics ? parseLRC(data.syncedLyrics) : null,
        plain: data.plainLyrics || null,
        instrumental: false
    };
}

/**
 * Tries an exact lookup for one candidate artist. lrclib's `/get` endpoint matches
 * artist_name, track_name, album_name and duration together, so it only succeeds
 * when the artist we send is the one lrclib has the track credited under.
 */
async function getExactFor(track: LookupTrack, artistName: string): Promise<LyricsResult | null> {
    const params = new URLSearchParams({
        artist_name: artistName,
        track_name: track.name,
        album_name: track.album?.name ?? "",
        duration: String(Math.round((track.duration ?? 0) / 1000))
    });

    const response = await requestLyrics(`${LRCLIB_ROOT}/get?${params.toString()}`);

    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Lyrics request failed (${response.status})`);

    return toResult(response.text ? JSON.parse(response.text) : null);
}

/** True when a search result's credited artist plausibly matches one of the track's artists. */
function artistsOverlap(resultArtist: string | undefined, artistNames: string[]): boolean {
    const needle = (resultArtist ?? "").toLowerCase();
    if (!needle) return false;

    return artistNames.some(name => {
        const haystack = name.toLowerCase();
        return needle.includes(haystack) || haystack.includes(needle);
    });
}

/** Picks a plausible `/search` hit, preferring word timing, then artist and duration match. */
function pickBestMatch(results: any[], artistNames: string[], durationSec: number): any | null {
    const candidates = (results ?? []).filter(Boolean);
    if (!candidates.length) return null;

    const scored = candidates.map(r => {
        const parsedLyrics = r.syncedLyrics ? parseLRC(r.syncedLyrics) : [];
        return {
            r,
            artistMatch: artistsOverlap(r.artistName, artistNames),
            wordSynced: parsedLyrics.some(line => line.words?.length),
            synced: parsedLyrics.length > 0,
            durationDiff: Math.abs((r.duration ?? 0) - durationSec)
        };
    });

    scored.sort((a, b) =>
        a.wordSynced !== b.wordSynced ? (a.wordSynced ? -1 : 1)
            : a.artistMatch !== b.artistMatch ? (a.artistMatch ? -1 : 1)
                : a.synced !== b.synced ? (a.synced ? -1 : 1)
                    : a.durationDiff - b.durationDiff
    );

    const best = scored[0];
    // no artist match and durations way off -> probably a different song with the same title
    if (!best.artistMatch && best.durationDiff > 3) return null;

    return best.r;
}

async function searchFor(track: LookupTrack, artistName: string | undefined): Promise<any[]> {
    const params = new URLSearchParams({ track_name: track.name });
    if (artistName) params.set("artist_name", artistName);

    const response = await requestLyrics(`${LRCLIB_ROOT}/search?${params.toString()}`);
    if (!response.ok) return [];

    return response.text ? JSON.parse(response.text) : [];
}

/**
 * Falls back to lrclib's fuzzy search when the exact lookup finds nothing. Spotify's
 * artists[0] isn't always who lrclib credits the track to (composer vs vocalist, feature
 * order, etc), so we try each credited artist in turn before giving up and searching by
 * title alone.
 */
async function searchClosest(track: LookupTrack): Promise<LyricsResult | null> {
    const artistNames = track.artists.map(a => a.name).filter(Boolean);
    const durationSec = Math.round((track.duration ?? 0) / 1000);
    let bestSynced: LyricsResult | null = null;
    let bestAny: LyricsResult | null = null;

    for (const artistName of artistNames) {
        const results = await searchFor(track, artistName);
        const best = pickBestMatch(results, artistNames, durationSec);
        if (best) {
            const result = toResult(best);
            if (hasWordSync(result)) return result;
            if (result.synced?.length && !bestSynced) bestSynced = result;
            if (!bestAny) bestAny = result;
        }
    }

    const results = await searchFor(track, undefined);
    const best = pickBestMatch(results, artistNames, durationSec);
    if (best) {
        const result = toResult(best);
        if (hasWordSync(result)) return result;
        if (result.synced?.length && !bestSynced) bestSynced = result;
        if (!bestAny) bestAny = result;
    }
    return bestSynced ?? bestAny;
}

async function searchSyncedLyrics(track: LookupTrack): Promise<LyricsResult | null> {
    if (typeof Native?.fetchSyncedLyrics !== "function") return null;
    const query = [track.name, track.artists.map(artist => artist.name).join(" ")].filter(Boolean).join(" ");
    try {
        const lrc = await Native.fetchSyncedLyrics(query);
        const synced = lrc ? parseLRC(lrc) : [];
        return synced.length ? { synced, plain: null, instrumental: false } : null;
    } catch (error) {
        console.warn("[BetterSpotify] Synced lyrics fallback failed:", error);
        return null;
    }
}

/** Fetches lyrics for a track, preferring an exact match and falling back to fuzzy search. */
async function fetchLyricsUncached(track: LookupTrack): Promise<LyricsResult> {
    if (!track?.name || !track.artists?.length) return EMPTY_RESULT;

    let syncedFallback: LyricsResult | null = null;
    let plainFallback: LyricsResult | null = null;
    for (const artist of track.artists) {
        const exact = await getExactFor(track, artist.name);
        if (hasWordSync(exact)) return exact!;
        if (exact?.synced?.length && !syncedFallback) syncedFallback = exact;
        if (exact?.plain && !plainFallback) plainFallback = exact;
    }

    const searched = await searchClosest(track);
    if (hasWordSync(searched)) return searched!;
    if (searched?.synced?.length && !syncedFallback) syncedFallback = searched;
    if (searched?.plain && !plainFallback) plainFallback = searched;

    // The Python helper requests enhanced LRC first and falls back to regular
    // synced LRC. Prefer its word-level result over LRCLIB's line-level result.
    const alternative = await searchSyncedLyrics(track);
    if (hasWordSync(alternative)) return alternative!;

    // Use line-synced lyrics only after both sources have had a chance to find
    // word-level timing. Prefer LRCLIB's line sync over syncedlyrics' line sync.
    return syncedFallback ?? alternative ?? plainFallback ?? EMPTY_RESULT;
}

/** Shares in-flight lookups between the mini-player and lyrics tab, then briefly reuses the result. */
export function fetchLyrics(track: LookupTrack): Promise<LyricsResult> {
    if (!track?.name || !track.artists?.length) return Promise.resolve(EMPTY_RESULT);

    const key = JSON.stringify([
        track.name.trim().toLowerCase(),
        track.artists.map(artist => artist.name?.trim().toLowerCase() ?? ""),
        track.album?.name?.trim().toLowerCase() ?? "",
        Math.round((track.duration ?? 0) / 1000)
    ]);
    const cached = lyricsCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
        lyricsCache.delete(key);
        lyricsCache.set(key, cached);
        return cached.promise;
    }

    lyricsCache.delete(key);
    const promise = fetchLyricsUncached(track);
    lyricsCache.set(key, { expiresAt: Date.now() + LYRICS_CACHE_TTL, promise });

    while (lyricsCache.size > LYRICS_CACHE_MAX_ENTRIES) {
        const oldestKey = lyricsCache.keys().next().value;
        if (oldestKey === undefined) break;
        lyricsCache.delete(oldestKey);
    }

    void promise.catch(() => {
        if (lyricsCache.get(key)?.promise === promise) lyricsCache.delete(key);
    });
    return promise;
}
