/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { isPluginEnabled } from "@api/PluginManager";
import OpenInAppPlugin from "@plugins/openInApp";
import { localStorage } from "@utils/localStorage";
import { findByProps, findByPropsLazy, proxyLazyWebpack } from "@webpack";
import { Flux, FluxDispatcher } from "@webpack/common";

import { settings } from "./settings";
import { SpotifyAuth } from "./SpotifyAuth";

export interface Track {
    id: string;
    name: string;
    duration: number;
    isLocal: boolean;

    album: {
        id: string;
        name: string;
        image: { height: number; width: number; url: string; };
    };

    artists: { id: string; href: string; name: string; type: string; uri: string; }[];
}

export interface SearchTrack {
    id: string;
    name: string;
    uri: string;

    artists: { id: string; name: string; }[];

    album: {
        id: string;
        name: string;
        images: { height: number; width: number; url: string; }[];
    };
}

export interface SpotifyArtist {
    id: string;
    name: string;
    uri: string;
    images: { url: string; height?: number; width?: number; }[];
    type?: string;
    followers?: { total: number; };
}

export interface SimplePlaylist {
    id: string;
    name: string;
    uri: string;
    description?: string;
    images: { url: string; height?: number; width?: number; }[];
    owner: { id: string; display_name?: string; };
    tracks?: { total: number; };

    /** Set by the store for pseudo-playlists (Liked Songs) that aren't real Spotify playlists. */
    isLikedSongs?: boolean;
}

export interface SpotifyProfile {
    id: string;
    display_name: string | null;
    images: { url: string; height?: number; width?: number; }[];
}

interface PlayerState {
    accountId: string;
    track: Track | null;
    volumePercent: number;
    isPlaying: boolean;
    repeat: boolean;
    position: number;
    context?: any;
    device?: Device | null;
    actual_repeat: Repeat;
    shuffle: boolean;
}

export interface Device {
    id: string;
    is_active: boolean;
    name?: string;
    type?: string;
    is_restricted?: boolean;
    volume_percent?: number | null;
}

const SEARCH_STOP_WORDS = new Set(["a", "an", "and", "for", "from", "in", "of", "on", "the", "to", "with"]);
const RECENTLY_PLAYED_KEY = "BetterSpotify_recentlyPlayed";
const MAX_RECENTLY_PLAYED = 10;

function readRecentlyPlayed(): SearchTrack[] {
    try {
        const value = JSON.parse(localStorage.getItem(RECENTLY_PLAYED_KEY) ?? "[]");
        return Array.isArray(value) ? value.slice(0, MAX_RECENTLY_PLAYED) : [];
    } catch {
        return [];
    }
}

function normalizeSearchText(value: string) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function matchesSearchQuery(query: string, text: string) {
    const normalizedQuery = normalizeSearchText(query);
    const normalizedText = normalizeSearchText(text);
    if (!normalizedQuery || normalizedText.includes(normalizedQuery)) return true;

    const terms = normalizedQuery.split(/\s+/).filter(term => term.length > 1 && !SEARCH_STOP_WORDS.has(term));
    if (!terms.length) return true;

    const matches = terms.filter(term => normalizedText.includes(term)).length;
    return matches >= Math.max(1, Math.ceil(terms.length * 0.7));
}

type Repeat = "off" | "track" | "context";

/** Id used for the Liked Songs pseudo-playlist, which has no real playlist id. */
export const LIKED_SONGS_ID = "__liked_songs__";



export const SpotifyStore = proxyLazyWebpack(() => {
    const { Store } = Flux;

    // Discord's Spotify socket handles playback requests; our patch adds POST support.
    const SpotifySocket = findByProps("getActiveSocketAndDevice");
    const SpotifyAPI = findByPropsLazy("vcSpotifyMarker");

    const API_ROOT = "https://api.spotify.com/v1";

    class SpotifyStore extends Store {
        // Interpolate position between SPOTIFY_PLAYER_STATE updates.
        public mPosition = 0;
        public _start = 0;

        public track: Track | null = null;
        public device: Device | null = null;
        public devices: Device[] = [];
        public isPlaying = false;
        public repeat: Repeat = "off";
        public shuffle = false;
        public volume = 0;
        public recentlyPlayed: SearchTrack[] = readRecentlyPlayed();

        /** True while a seek request is in flight, to avoid the position snapping back before the new state arrives. */
        public isSettingPosition = false;

        /** Guards against overlapping autoplay-fallback requests and repeated triggers off the same stop event. */
        private _fallbackInFlight = false;
        private _lastFallbackAt = 0;

        /** Opens a Spotify path either as a spotify: URI (desktop app) or an open.spotify.com URL, per user settings. */
        public openExternal(path: string) {
            const useUri = settings.store.useSpotifyUris || isPluginEnabled(OpenInAppPlugin.name);

            const url = useUri
                ? "spotify:" + path.replaceAll("/", (_, idx) => (idx === 0 ? "" : ":"))
                : "https://open.spotify.com" + path;

            VencordNative.native.openExternal(url);
        }

        public getExternalUrl(path: string) {
            return "https://open.spotify.com" + path;
        }

        private recordRecentlyPlayed(track: Track | null) {
            // Local files do not have a Spotify track URI, so they cannot be
            // replayed or queued through the Spotify Web API.
            if (!track?.id || !track.name || track.isLocal) return;

            const recent: SearchTrack = {
                id: track.id,
                name: track.name,
                uri: `spotify:track:${track.id}`,
                artists: (track.artists ?? []).map(artist => ({ id: artist.id, name: artist.name })),
                album: {
                    id: track.album?.id ?? "",
                    name: track.album?.name ?? "",
                    images: track.album?.image?.url ? [track.album.image] : []
                }
            };
            this.recentlyPlayed = [recent, ...this.recentlyPlayed.filter(item => item.id !== track.id)].slice(0, MAX_RECENTLY_PLAYED);
            try {
                localStorage.setItem(RECENTLY_PLAYED_KEY, JSON.stringify(this.recentlyPlayed));
            } catch (error) {
                console.warn("[BetterSpotify] Could not save recently played tracks:", error);
            }
        }

        public get position(): number {
            let pos = this.mPosition;
            if (this.isPlaying) pos += Date.now() - this._start;
            return pos;
        }

        public set position(p: number) {
            this.mPosition = p;
            this._start = Date.now();
        }

        prev() {
            return this._req("post", "/previous");
        }

        next() {
            return this._req("post", "/next");
        }

        setVolume(percent: number) {
            return this._req("put", "/volume", { query: { volume_percent: Math.round(percent) } }).then(() => {
                this.volume = percent;
                this.emitChange();
            });
        }

        setPlaying(playing: boolean) {
            return this._req("put", playing ? "/play" : "/pause");
        }

        async playTrack(uri: string) {
            const query = this.device?.is_active ? { device_id: this.device.id } : undefined;
            return this._webApi("PUT", "/me/player/play", { uris: [uri] }, query);
        }

        /** Picks a random track from the user's Liked Songs and plays it. Used as the autoplay fallback. */
        async playRandomSavedTrack() {
            const first = await this._webApi("GET", "/me/tracks", undefined, { limit: "1" });
            const total: number = first?.total ?? 0;
            if (!total) return;

            const offset = Math.floor(Math.random() * total);
            const page = await this._webApi("GET", "/me/tracks", undefined, { limit: "1", offset: String(offset) });
            const uri: string | undefined = page?.items?.[0]?.track?.uri;
            if (!uri) return;

            return this.playTrack(uri);
        }

        async queueTrack(uri: string) {
            return this._webApi("POST", "/me/player/queue", undefined, { uri });
        }

        /** The connected Spotify account's profile (display name + avatar), for personalizing the menu header. */
        async getMe(): Promise<SpotifyProfile | null> {
            return this._webApi("GET", "/me");
        }

        /** Searches tracks, playlists and artists in one request, for the menu's search tab. */
        async search(query: string): Promise<{ tracks: SearchTrack[]; playlists: SimplePlaylist[]; artists: SpotifyArtist[]; }> {
            const trimmed = query.trim();
            if (!trimmed) return { tracks: [], playlists: [], artists: [] };

            const result = await this._webApi("GET", "/search", undefined, {
                q: trimmed,
                type: "track,playlist,artist",
                limit: "12"
            });

            const artists: SpotifyArtist[] = (result?.artists?.items ?? []).filter((artist: SpotifyArtist | null): artist is SpotifyArtist =>
                artist !== null && matchesSearchQuery(trimmed, artist.name)
            );
            const followed = await this.areArtistsFollowed(artists.map(artist => artist.uri));

            return {
                // Spotify sometimes includes fuzzy, unrelated results. Keep songs
                // relevant to the title/artist and playlists relevant to their names.
                tracks: (result?.tracks?.items ?? []).filter((track: SearchTrack | null): track is SearchTrack =>
                    track !== null && matchesSearchQuery(trimmed, `${track.name} ${(track.artists ?? []).map(artist => artist.name).join(" ")}`)
                ),
                playlists: (result?.playlists?.items ?? []).filter((playlist: SimplePlaylist | null): playlist is SimplePlaylist =>
                    playlist !== null && matchesSearchQuery(trimmed, playlist.name)
                ),
                artists: artists.map((artist, index) => ({ ...artist, isFollowed: followed[index] ?? false }))
            };
        }

        /** Follow state for up to 40 artists, using Spotify's current library endpoint. */
        async areArtistsFollowed(artistUris: string[]): Promise<boolean[]> {
            if (!artistUris.length) return [];
            const states: boolean[] = [];
            for (let start = 0; start < artistUris.length; start += 40) {
                const batch = artistUris.slice(start, start + 40);
                const result = await this._webApi("GET", "/me/library/contains", undefined, { uris: batch.join(",") });
                states.push(...(Array.isArray(result) ? result : batch.map(() => false)));
            }
            return states;
        }

        /** Artist follows from the current Spotify account. Spotify marks /me/following deprecated, but it remains the only listing endpoint. */
        async getMyArtists(max = 300): Promise<SpotifyArtist[]> {
            const artists: SpotifyArtist[] = [];
            let after: string | undefined;

            while (artists.length < max) {
                const page = await this._webApi("GET", "/me/following", undefined, {
                    type: "artist",
                    limit: "50",
                    ...(after ? { after } : {})
                });
                const items: SpotifyArtist[] = page?.artists?.items ?? [];
                artists.push(...items.filter(Boolean));
                after = page?.artists?.cursors?.after;
                if (!after || items.length === 0) break;
            }
            return artists.slice(0, max);
        }

        async setArtistFollowed(artist: SpotifyArtist, followed: boolean) {
            await this._webApi(followed ? "PUT" : "DELETE", "/me/library", { uris: [artist.uri] });
        }

        /** All playlists in the user's library (own, followed and collaborative), paginated. */
        async getMyPlaylists(max = 150): Promise<SimplePlaylist[]> {
            const playlists: SimplePlaylist[] = [];
            let offset = 0;

            while (playlists.length < max) {
                const page = await this._webApi("GET", "/me/playlists", undefined, {
                    limit: "50",
                    offset: String(offset)
                });

                const items: SimplePlaylist[] = (page?.items ?? []).filter(Boolean);
                playlists.push(...items);

                if (!page?.next || items.length === 0) break;
                offset += 50;
            }

            return playlists.slice(0, max);
        }

        /** A pseudo-playlist entry for Liked Songs, so it can sit alongside real playlists in the UI. */
        async getLikedSongsPlaylist(): Promise<SimplePlaylist | null> {
            try {
                const first = await this._webApi("GET", "/me/tracks", undefined, { limit: "1" });

                return {
                    id: LIKED_SONGS_ID,
                    name: "Liked Songs",
                    uri: "",
                    description: "Songs you've saved on Spotify",
                    images: [],
                    owner: { id: "", display_name: "You" },
                    tracks: { total: first?.total ?? 0 },
                    isLikedSongs: true
                };
            } catch (err) {
                console.error("[VibeCord] Failed to load Liked Songs", err);
                return null;
            }
        }

        /** Tracks of a playlist, or of Liked Songs when given the pseudo-playlist id. */
        async getPlaylistTracks(playlistId: string, max = 100): Promise<SearchTrack[]> {
            const route = playlistId === LIKED_SONGS_ID ? "/me/tracks" : `/playlists/${playlistId}/tracks`;
            const tracks: SearchTrack[] = [];
            let offset = 0;

            while (tracks.length < max) {
                const page = await this._webApi("GET", route, undefined, {
                    limit: "50",
                    offset: String(offset)
                });

                const items = (page?.items ?? [])
                    .map((item: any) => item?.track)
                    .filter((track: any) => track?.uri && track.type !== "episode");

                tracks.push(...items);

                if (!page?.next || (page?.items ?? []).length === 0) break;
                offset += 50;
            }

            return tracks.slice(0, max);
        }

        /** Starts playback of a playlist/album context, optionally from a specific track. */
        async playContext(contextUri: string, offsetUri?: string) {
            const query = this.device?.is_active ? { device_id: this.device.id } : undefined;

            const body: any = { context_uri: contextUri };
            if (offsetUri) body.offset = { uri: offsetUri };

            return this._webApi("PUT", "/me/player/play", body, query);
        }

        /** Plays a list of track URIs. Used for Liked Songs, which has no playable context URI. */
        async playTracks(uris: string[], startIndex = 0) {
            if (!uris.length) return;

            const query = this.device?.is_active ? { device_id: this.device.id } : undefined;
            const ordered = [...uris.slice(startIndex), ...uris.slice(0, startIndex)];

            return this._webApi("PUT", "/me/player/play", { uris: ordered.slice(0, 50) }, query);
        }

        /** Plays a playlist from the start, handling the Liked Songs special case. */
        async playPlaylist(playlist: SimplePlaylist) {
            if (!playlist.isLikedSongs) return this.playContext(playlist.uri);

            const tracks = await this.getPlaylistTracks(LIKED_SONGS_ID, 50);
            return this.playTracks(tracks.map(t => t.uri));
        }

        setRepeat(state: Repeat) {
            return this._req("put", "/repeat", { query: { state } }).then(() => {
                this.repeat = state;
                this.emitChange();
            });
        }

        setShuffle(state: boolean) {
            return this._req("put", "/shuffle", { query: { state: String(state) } }).then(() => {
                this.shuffle = state;
                this.emitChange();
            });
        }

        async refreshDevices() {
            const response = await this._webApi("GET", "/me/player/devices");
            this.devices = response?.devices ?? [];
            const activeDevice = this.devices.find(device => device.is_active);
            if (activeDevice) this.device = activeDevice;
            this.emitChange();
            return this.devices;
        }

        async transferPlayback(deviceId: string) {
            const target = this.devices.find(device => device.id === deviceId);
            if (!target || target.is_restricted) throw new Error("This Spotify device is unavailable for playback transfer.");

            await this._webApi("PUT", "/me/player", {
                device_ids: [deviceId],
                play: this.isPlaying
            });

            this.devices = this.devices.map(device => ({ ...device, is_active: device.id === deviceId }));
            this.device = this.devices.find(device => device.id === deviceId) ?? target;
            this.emitChange();
        }

        seek(ms: number) {
            if (this.isSettingPosition) return Promise.resolve();
            this.isSettingPosition = true;

            return this._req("put", "/seek", { query: { position_ms: Math.round(ms) } }).catch((e: any) => {
                console.error("[VibeCord] Failed to seek", e);
                this.isSettingPosition = false;
            });
        }

        /** Calls the Spotify Web API directly (used for search/play/queue, which the internal socket API doesn't cover). */
        async _webApi(method: "GET" | "POST" | "PUT" | "DELETE", route: string, body?: any, query?: Record<string, string>) {
            const token = await SpotifyAuth.getAccessToken();
            const url = new URL(API_ROOT + route);

            if (query) {
                for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
            }

            const response = await fetch(url.toString(), {
                method,
                headers: {
                    Authorization: `Bearer ${token}`,
                    ...(body !== undefined ? { "Content-Type": "application/json" } : {})
                },
                ...(body !== undefined ? { body: JSON.stringify(body) } : {})
            });

            if (response.status === 204) return null;

            const text = await response.text();
            let data: any = null;
            try {
                data = text ? JSON.parse(text) : null;
            } catch {
                data = null;
            }

            if (!response.ok) {
                const message = data?.error?.message || data?.error_description || `Spotify API request failed (${response.status})`;
                throw new Error(message);
            }

            return data;
        }

        /** Calls the Spotify Web API through Discord's own authenticated socket connection. */
        _apiReq(method: "post" | "get" | "put", route: string, data: any = {}) {
            const { socket } = SpotifySocket.getActiveSocketAndDevice();

            return SpotifyAPI[method](socket.accountId, socket.accessToken, {
                url: API_ROOT + route,
                ...data
            });
        }

        /** Like `_apiReq`, but scoped to `/me/player` and targeting the currently active device when there is one. */
        _req(method: "post" | "get" | "put", route: string, data: any = {}) {
            if (this.device?.is_active) (data.query ??= {}).device_id = this.device.id;
            return this._apiReq(method, "/me/player" + route, data);
        }

        /** Starts a random Liked Song when playback ends with nothing queued, if fallback is enabled. */
        _maybeAutoplayFallback(prevTrackId: string | undefined, prevWasPlaying: boolean, prevDuration: number, prevPosition: number) {
            if (!settings.store.autoplayFallback) return;
            if (this._fallbackInFlight) return;
            if (Date.now() - this._lastFallbackAt < 4000) return;
            if (!this.device?.is_active) return;

            const sameTrackStopped = prevWasPlaying && !this.isPlaying && prevTrackId && prevTrackId === this.track?.id;
            const ranToEnd = prevDuration > 0 && prevPosition >= prevDuration - 1200;
            if (!sameTrackStopped || !ranToEnd) return;

            this._fallbackInFlight = true;
            this._lastFallbackAt = Date.now();

            this.playRandomSavedTrack()
                .catch((err: any) => console.error("[VibeCord] Autoplay fallback failed", err))
                .finally(() => { this._fallbackInFlight = false; });
        }
    }

    const store = new SpotifyStore(FluxDispatcher, {
        SPOTIFY_PLAYER_STATE(e: PlayerState) {
            // Keep the previous state to detect when a track ends without queued content.
            const prevTrackId = store.track?.id;
            const prevWasPlaying = store.isPlaying;
            const prevDuration = store.track?.duration ?? 0;
            const prevPosition = store.position;

            store.track = e.track;
            if (e.track?.id !== prevTrackId && e.isPlaying) store.recordRecentlyPlayed(e.track);
            // Keep the last known device when an update omits it.
            if (e.device !== undefined) store.device = e.device;
            if (e.device?.id) {
                store.devices = [e.device, ...store.devices.filter(device => device.id !== e.device?.id)]
                    .map(device => ({ ...device, is_active: device.id === e.device?.id }));
            }
            store.isPlaying = e.isPlaying ?? false;
            store.volume = e.volumePercent ?? 0;
            store.repeat = e.actual_repeat || "off";
            store.shuffle = e.shuffle ?? false;
            store.position = e.position ?? 0;
            store.isSettingPosition = false;

            store.emitChange();

            store._maybeAutoplayFallback(prevTrackId, prevWasPlaying, prevDuration, prevPosition);
        },

        SPOTIFY_SET_DEVICES({ devices }: { devices: Device[]; }) {
            store.devices = devices;
            const activeDevice = devices.find(d => d.is_active);
            if (activeDevice) store.device = activeDevice;
            else if (!store.device?.is_active) store.device = devices[0] ?? null;
            store.emitChange();
        }
    });

    return store;
});
