/*
 * Vencord, a modification for Discord's desktop app
 * GPL v3
 */

import "./spotifyStyles.css";

import { classNameFactory } from "@api/Styles";
import { React, useState, useStateFromStores } from "@webpack/common";

import { Controls } from "./components/Controls";
import { LyricsPreview } from "./components/LyricsPreview";
import { Info } from "./components/TrackInfo";
import { settings } from "./settings";
import { SpotifyStore } from "./SpotifyStore";

const cl = classNameFactory("vc-spotify-");

/** Track equality that also matches locally-played files, which may share an id but not a name (or vice versa). */
function isSameTrack(prev: any, next: any) {
    return prev?.id ? prev.id === next?.id : prev?.name === next?.name;
}

function isSameDevice(prev: any, next: any) {
    return prev?.id === next?.id;
}

/** How long to keep the player mounted after playback stops, before hiding it. */
const HIDE_AFTER_IDLE_MS = 5 * 60 * 1000;

export function Player() {
    const track = useStateFromStores([SpotifyStore], () => SpotifyStore.track, null, isSameTrack);
    const device = useStateFromStores([SpotifyStore], () => SpotifyStore.device, null, isSameDevice);
    const isPlaying = useStateFromStores([SpotifyStore], () => SpotifyStore.isPlaying);

    const [shouldHide, setShouldHide] = useState(false);

    const { fontFamily, fontSize, albumSize, accentColor, backgroundColor, showLyricsPreview, lyricsPreviewFontSize, lyricsTextColor, lyricsGlowColor } = settings.use([
        "fontFamily",
        "fontSize",
        "albumSize",
        "accentColor",
        "backgroundColor",
        "showLyricsPreview",
        "lyricsPreviewFontSize",
        "lyricsTextColor",
        "lyricsGlowColor"
    ]);

    // Keep the player visible while playing; once paused, fade it out after
    // a grace period rather than disappearing instantly.
    React.useEffect(() => {
        setShouldHide(false);
        if (isPlaying) return;

        const timeout = setTimeout(() => setShouldHide(true), HIDE_AFTER_IDLE_MS);
        return () => clearTimeout(timeout);
    }, [isPlaying]);

    if (!track || !device?.is_active || shouldHide) return null;

    const themeStyle = {
        "--vc-spotify-accent": accentColor || "var(--brand-experiment, #5865f2)",
        "--vc-spotify-bg": backgroundColor || "transparent",
        "--vc-spotify-font": fontFamily,
        "--vc-spotify-font-size": `${fontSize}px`,
        "--vc-spotify-album-size": `${albumSize}px`,
        "--vc-spotify-lyrics-font-size": `${lyricsPreviewFontSize}px`,
        "--vc-spotify-lyrics-text-color": lyricsTextColor || "var(--vc-spotify-fg)",
        "--vc-spotify-lyrics-active-color": lyricsGlowColor || "var(--brand-experiment, var(--vc-spotify-fg))"
        // Text and icon colors come from CSS to follow the Discord theme.
    } as React.CSSProperties;

    return (
        <div id={cl("player")} style={themeStyle}>
            <div className={cl("player-main")}>
                <Info track={track} />
                <Controls />
            </div>
            {showLyricsPreview && <LyricsPreview track={track} />}
        </div>
    );
}
