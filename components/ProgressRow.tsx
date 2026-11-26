/*
 * Vencord, a modification for Discord's desktop app
 * GPL v3
 */

import { classNameFactory } from "@api/Styles";
import { debounce } from "@shared/debounce";
import { useEffect, useRef, useState, useStateFromStores } from "@webpack/common";

import { msToHuman } from "../lib/format";
import { SeekBar } from "../SeekBar";
import { settings } from "../settings";
import { SpotifyStore, Track } from "../SpotifyStore";

const cl = classNameFactory("vc-spotify-");
const seek = debounce((value: number) => SpotifyStore.seek(value));

/** Plain "elapsed / total" text, shown when the seek bar setting is off. */
function PlainTimeRow({ position, duration }: { position: number; duration: number; }) {
    return (
        <div id={cl("time-row")} className={cl("plain-time-row")} aria-live="polite">
            <span className={cl("time-text")}>{msToHuman(position)}</span>
            <span className={cl("time-sep")}>/</span>
            <span className={cl("time-text")}>{msToHuman(duration)}</span>
        </div>
    );
}

/** Draggable seek bar flanked by elapsed / total time, shown when the seek bar setting is on. */
function SeekTimeRow({ position, duration, onPositionChange, onSeekStart, onSeekEnd }: {
    position: number;
    duration: number;
    onPositionChange: (v: number) => void;
    onSeekStart: () => void;
    onSeekEnd: () => void;
}) {
    const progress = duration > 0
        ? Math.min(100, Math.max(0, (position / duration) * 100))
        : 0;

    const handleSeekChange = (value: number) => {
        onPositionChange(value);
        seek(value);
    };

    return (
        <div id={cl("time-row")} className={cl("seek-row")} aria-live="polite">
            <span className={cl("time-text")}>{msToHuman(position)}</span>

            <div className={cl("slider-wrap")} onPointerDown={onSeekStart} onPointerUp={onSeekEnd} onPointerCancel={onSeekEnd}>
                <div className={cl("progress-visual")} aria-hidden="true">
                    <div className={cl("progress-track")} />
                    <div className={cl("progress-fill")} style={{ width: `${progress}%` }} />
                    <div className={cl("progress-thumb")} style={{ left: `${progress}%` }} />
                </div>
                <SeekBar
                    className={cl("progress-slider-input")}
                    minValue={0}
                    maxValue={duration || 1}
                    initialValue={position}
                    hideBubble
                    handleSize={10}
                    asValueChanges={handleSeekChange}
                    onValueChange={handleSeekChange}
                    onValueRender={msToHuman}
                />
            </div>

            <span className={cl("time-text")}>{msToHuman(duration)}</span>
        </div>
    );
}
export function ProgressRow({ track }: { track: Track; }) {
    const [position, setPosition] = useState(SpotifyStore.position ?? 0);
    const isSeeking = useRef(false);
    const isPlaying = useStateFromStores([SpotifyStore], () => SpotifyStore.isPlaying);
    const { showSeekBar } = settings.use(["showSeekBar"]);

    // Poll the store's live position once a second so the displayed time
    // stays in sync while a track is playing.
    useEffect(() => {
        setPosition(SpotifyStore.position ?? 0);
        if (!isPlaying) return;

        const id = setInterval(() => {
            if (!isSeeking.current) setPosition(SpotifyStore.position ?? 0);
        }, 1000);
        return () => clearInterval(id);
    }, [track?.id, isPlaying]);

    const duration = track.duration ?? 0;

    return showSeekBar
        ? <SeekTimeRow position={position} duration={duration} onPositionChange={setPosition} onSeekStart={() => { isSeeking.current = true; }} onSeekEnd={() => { isSeeking.current = false; }} />
        : <PlainTimeRow position={position} duration={duration} />;
}
