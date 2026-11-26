/*
 * Vencord, a modification for Discord's desktop app
 * GPL v3
 */

import { classNameFactory } from "@api/Styles";
import { classes } from "@utils/misc";
import { useEffect, useState, useStateFromStores } from "@webpack/common";

import { fetchLyrics, LyricsResult } from "../lib/lyrics";
import { SpotifyStore, Track } from "../SpotifyStore";
import { settings } from "../settings";
import { LyricsLineText } from "./LyricsLineText";

const cl = classNameFactory("vc-spotify-");

export function LyricsPreview({ track }: { track: Track; }) {
    const isPlaying = useStateFromStores([SpotifyStore], () => SpotifyStore.isPlaying);
    const { lyricsPreviewLineCount } = settings.use(["lyricsPreviewLineCount"]);
    const [lyrics, setLyrics] = useState<LyricsResult | null>(null);
    const [position, setPosition] = useState(SpotifyStore.position ?? 0);
    const hasWordSync = Boolean(lyrics?.synced?.some(line => line.words?.length));

    useEffect(() => {
        let cancelled = false;
        setLyrics(null);

        fetchLyrics(track)
            .then(result => { if (!cancelled) setLyrics(result); })
            .catch(error => console.error("[VibeCord] Failed to load player lyrics:", error));

        return () => { cancelled = true; };
    }, [track.id, track.name]);

    useEffect(() => {
        setPosition(SpotifyStore.position ?? 0);
        if (!isPlaying) return;

        const interval = setInterval(() => setPosition(SpotifyStore.position ?? 0), hasWordSync ? 250 : 500);
        return () => clearInterval(interval);
    }, [track.id, isPlaying, hasWordSync]);

    const lines = lyrics?.synced;
    if (!lines?.length) {
        const plainLines = lyrics?.plain?.split(/\r?\n/);
        if (!plainLines?.length) return null;

        return (
            <div
                className={classes(cl("lyrics-preview"), cl("lyrics-preview-plain"))}
                aria-label="Unsynced lyrics"
                onWheel={event => {
                    const element = event.currentTarget;
                    const canScrollUp = element.scrollTop > 0 && event.deltaY < 0;
                    const canScrollDown = element.scrollTop + element.clientHeight < element.scrollHeight && event.deltaY > 0;
                    if (canScrollUp || canScrollDown) event.stopPropagation();
                }}
            >
                {plainLines.map((line, index) => (
                    <div key={index} className={cl("lyrics-preview-plain-line")}>{line || "\u00a0"}</div>
                ))}
            </div>
        );
    }

    let currentIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].time > position) break;
        currentIndex = i;
    }

    // Keep the first line as the preview's current line until its timestamp arrives.
    const displayCurrentIndex = Math.max(currentIndex, 0);
    const lineCount = Math.min(10, Math.max(1, Math.round(lyricsPreviewLineCount || 3)));
    const linesBefore = lineCount >= 3 ? 1 : 0;
    const linesAfter = lineCount - linesBefore - 1;
    const startIndex = Math.max(0, displayCurrentIndex - linesBefore);
    const endIndex = Math.min(lines.length, displayCurrentIndex + linesAfter + 1);
    const visibleLines = lines.slice(startIndex, endIndex);

    return (
        <div className={cl("lyrics-preview")} aria-live="polite" aria-label="Current and surrounding synced lyrics">
            {visibleLines.map((line, index) => {
                const lineIndex = startIndex + index;
                const isCurrent = lineIndex === displayCurrentIndex;
                const className = isCurrent
                    ? classes(cl("lyrics-preview-current"), line.words?.length ? "is-word-synced" : "is-line-synced")
                    : lineIndex < displayCurrentIndex ? cl("lyrics-preview-previous") : cl("lyrics-preview-upcoming");

                return (
                    <div key={`${line.time}-${lineIndex}`} className={className}>
                        <LyricsLineText line={line} position={position} highlightWord={isCurrent} />
                    </div>
                );
            })}
        </div>
    );
}
