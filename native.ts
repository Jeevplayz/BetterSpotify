/*
 * Vencord, a Discord client mod
 * GPL v3
 */

import { CspPolicies, ImageSrc } from "@main/csp";
import { execFile as cpExecFile } from "child_process";
import { IpcMainInvokeEvent, net } from "electron";
import { promisify } from "util";

// Spotify custom playlist covers use spotifycdn.com, which is separate from the already-allowed scdn.co host.
CspPolicies["spotifycdn.com"] = ImageSrc;
CspPolicies["*.spotifycdn.com"] = ImageSrc;

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const LRCLIB_API_ORIGIN = "https://lrclib.net";
const execFile = promisify(cpExecFile);
let warnedSyncedLyricsUnavailable = false;

/** Exchanges Spotify OAuth form data from the main process to avoid renderer CORS restrictions. */
export async function exchangeSpotifyToken(_: IpcMainInvokeEvent, body: string) {
    const response = await net.fetch(SPOTIFY_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body
    });

    return {
        ok: response.ok,
        status: response.status,
        text: await response.text()
    };
}

/** Fetches an LRCLIB API endpoint from the main process to avoid renderer CORS/CSP failures. */
export async function fetchLyrics(_: IpcMainInvokeEvent, requestUrl: string) {
    const url = new URL(requestUrl);
    if (url.origin !== LRCLIB_API_ORIGIN || !url.pathname.startsWith("/api/")) {
        throw new Error("Lyrics requests must target the LRCLIB API.");
    }

    const response = await net.fetch(url.toString(), {
        headers: { Accept: "application/json" }
    });

    return {
        ok: response.ok,
        status: response.status,
        text: await response.text()
    };
}

/** Uses syncedlyrics as an optional fallback, preferring enhanced word-timed LRC. */
export async function fetchSyncedLyrics(_: IpcMainInvokeEvent, query: string): Promise<string | null> {
    const term = query.trim();
    if (!term) return null;

    const candidates = process.platform === "win32"
        ? [
            { command: "py", args: ["-3"] },
            { command: "python", args: [] },
            { command: "python3", args: [] }
        ]
        : [
            { command: "python3", args: [] },
            { command: "python", args: [] }
        ];

    let lastError: unknown;
    for (const { command, args } of candidates) {
        try {
            const { stdout } = await execFile(command, [
                ...args,
                "-m", "syncedlyrics",
                "--synced-only",
                "--enhanced",
                "-o", process.platform === "win32" ? "NUL" : "/dev/null",
                "--",
                term
            ], {
                windowsHide: true,
                timeout: 30_000,
                maxBuffer: 1024 * 1024
            });

            const lrc = stdout.trim();
            if (lrc) return lrc;
        } catch (error: any) {
            lastError = error;
            const details = String(error?.stderr ?? error?.message ?? error);
            // Try other Python launchers when this one is missing or lacks the package.
            if (error?.code === "ENOENT" || /No module named ['\"]syncedlyrics['\"]/.test(details)) continue;
            break;
        }
    }

    if (lastError) {
        const details = String((lastError as any)?.stderr ?? (lastError as any)?.message ?? lastError);
        if (!warnedSyncedLyricsUnavailable && (/No module named ['\"]syncedlyrics['\"]/.test(details) || (lastError as any)?.code === "ENOENT")) {
            console.warn("[BetterSpotify] Synced lyrics fallback unavailable; install Python and run: python -m pip install syncedlyrics");
            warnedSyncedLyricsUnavailable = true;
        } else {
            console.warn("[BetterSpotify] Synced lyrics fallback failed:", details);
        }
    }

    return null;
}
