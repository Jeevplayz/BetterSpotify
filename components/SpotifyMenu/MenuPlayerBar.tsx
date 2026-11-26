/*
 * Vencord, a modification for Discord's desktop app
 * GPL v3
 */

import { classNameFactory } from "@api/Styles";
import { debounce } from "@shared/debounce";
import { classes } from "@utils/misc";
import { ContextMenuApi, Menu, React, useEffect, useState, useStateFromStores } from "@webpack/common";

import { msToHuman } from "../../lib/format";
import { SeekBar } from "../../SeekBar";
import { settings } from "../../settings";
import { SpotifyStore } from "../../SpotifyStore";
import { Controls } from "../Controls";
import { ConnectDeviceMobileIcon, RepeatIcon, RepeatOffIcon, RepeatOneIcon, ShuffleIcon, ShuffleOffIcon, VolumeHigh, VolumeLow, VolumeMuted } from "../icons";

const cl = classNameFactory("vc-spotify-");

/** Track equality that also matches locally-played files, which may share an id but not a name (or vice versa). */
function isSameTrack(prev: any, next: any) {
    return prev?.id ? prev.id === next?.id : prev?.name === next?.name;
}

/** Icon + slider volume control, with a click-to-mute toggle that remembers the last non-zero level. */
function VolumeControl() {
    const volume = useStateFromStores([SpotifyStore], () => SpotifyStore.volume);
    const lastVolume = React.useRef(volume || 50);

    useEffect(() => {
        if (volume > 0) lastVolume.current = volume;
    }, [volume]);

    const setVolume = debounce((v: number) => SpotifyStore.setVolume(v));

    const toggleMute = () => {
        if (volume > 0) setVolume(0);
        else setVolume(lastVolume.current || 50);
    };

    const Icon = volume === 0 ? VolumeMuted : volume < 50 ? VolumeLow : VolumeHigh;

    return (
        <div className={cl("menu-player-volume")}>
            <button
                className={cl("button", "menu-player-volume-btn")}
                onClick={toggleMute}
                aria-label={volume === 0 ? "Unmute" : "Mute"}
                title={volume === 0 ? "Unmute" : "Mute"}
            >
                <Icon />
            </button>

            <div className={cl("menu-player-volume-slider-wrap")}>
                <SeekBar
                    className={cl("progress-slider")}
                    minValue={0}
                    maxValue={100}
                    initialValue={volume}
                    asValueChanges={setVolume}
                    onValueRender={(v: number) => `${Math.round(v)}%`}
                />
            </div>
        </div>
    );
}

function DeviceControl() {
    const activeDevice = useStateFromStores([SpotifyStore], () => SpotifyStore.device);

    return (
        <div className={cl("device-control")}>
            <button
                type="button"
                className={cl("button", "device-button")}
                aria-label="Choose Spotify playback device"
                title={`Connect to a device${activeDevice?.name ? `: ${activeDevice.name}` : ""}`}
                onClick={event => {
                    event.preventDefault();
                    ContextMenuApi.openContextMenu(event, () => <SpotifyDeviceMenu />);
                }}
            >
                <ConnectDeviceMobileIcon />
            </button>
        </div>
    );
}

function SpotifyDeviceMenu() {
    const devices = useStateFromStores([SpotifyStore], () => SpotifyStore.devices);
    const activeDevice = useStateFromStores([SpotifyStore], () => SpotifyStore.device);

    useEffect(() => {
        void SpotifyStore.refreshDevices().catch(error => console.error("[BetterSpotify] Failed to load devices:", error));
    }, []);

    // The device list usually grows right after the menu opens (the store only knows the active
    // device at first, then refreshDevices() adds the rest). Keying on the ids remounts the menu
    // when that happens so Discord re-measures it instead of keeping the shorter first-render box.
    const deviceKey = devices.map(device => device.id).join("|") || "none";

    return (
        <Menu.Menu
            key={deviceKey}
            navId="spotify-connect-devices"
            onClose={ContextMenuApi.closeContextMenu}
            aria-label="Connect to a device"
            className={cl("device-menu")}
        >
            {devices.length ? devices.map(device => (
                <Menu.MenuItem
                    key={device.id}
                    id={`spotify-device-${device.id}`}
                    label={`${device.name || "Spotify device"}${device.id === activeDevice?.id ? " (Playing here)" : ""}`}
                    disabled={device.is_restricted}
                    action={() => {
                        if (device.id !== activeDevice?.id) {
                            void SpotifyStore.transferPlayback(device.id).catch(error => console.error("[BetterSpotify] Failed to switch device:", error));
                        }
                    }}
                />
            )) : (
                <Menu.MenuItem id="spotify-no-devices" label="Loading devices…" disabled action={() => {}} />
            )}
            <Menu.MenuItem
                id="spotify-refresh-devices"
                label="Refresh devices"
                action={() => {
                    void SpotifyStore.refreshDevices().catch(error => console.error("[BetterSpotify] Failed to refresh devices:", error));
                }}
            />
        </Menu.Menu>
    );
}

function ShuffleControl() {
    const shuffle = useStateFromStores([SpotifyStore], () => SpotifyStore.shuffle);
    const ShuffleGlyph = shuffle ? ShuffleIcon : ShuffleOffIcon;

    const toggleShuffle = () => {
        void SpotifyStore.setShuffle(!shuffle).catch(error => console.error("[BetterSpotify] Failed to change shuffle:", error));
    };

    return (
        <button
            type="button"
            className={classes(cl("button", "menu-player-mode-btn"), shuffle && "is-active")}
            onClick={toggleShuffle}
            aria-label={`Shuffle ${shuffle ? "on" : "off"}`}
            title={`Shuffle ${shuffle ? "on" : "off"}`}
            aria-pressed={shuffle}
        >
            <ShuffleGlyph />
        </button>
    );
}

function RepeatControl() {
    const repeat = useStateFromStores([SpotifyStore], () => SpotifyStore.repeat);
    const RepeatGlyph = repeat === "off" ? RepeatOffIcon : repeat === "track" ? RepeatOneIcon : RepeatIcon;
    const repeatLabel = repeat === "context" ? "all" : repeat;

    const toggleRepeat = () => {
        const next = repeat === "off" ? "context" : repeat === "context" ? "track" : "off";
        void SpotifyStore.setRepeat(next).catch(error => console.error("[BetterSpotify] Failed to change repeat mode:", error));
    };

    return (
        <button
            type="button"
            className={classes(cl("button", "menu-player-mode-btn"), repeat !== "off" && "is-active")}
            onClick={toggleRepeat}
            aria-label={`Repeat ${repeatLabel}`}
            title={`Repeat ${repeatLabel}`}
            aria-pressed={repeat !== "off"}
        >
            <RepeatGlyph />
        </button>
    );
}

/**
 * A compact "now playing" bar pinned to the bottom of the Spotify menu, so the user can
 * scrub, skip and pause without leaving the modal. Mirrors PlayerComponent/ProgressRow's
 * behaviour but in a layout that fits a single footer row instead of the small player.
 */
export function MenuPlayerBar() {
    const menuIconSize = settings.use(["menuIconSize"]).menuIconSize;
    const track = useStateFromStores([SpotifyStore], () => SpotifyStore.track, null, isSameTrack);
    const device = useStateFromStores([SpotifyStore], () => SpotifyStore.device);
    const isPlaying = useStateFromStores([SpotifyStore], () => SpotifyStore.isPlaying);

    const [position, setPosition] = useState(SpotifyStore.position ?? 0);

    // Poll the store's live position once a second so the seek bar stays in sync while playing,
    // the same approach ProgressRow uses for the small player.
    useEffect(() => {
        setPosition(SpotifyStore.position ?? 0);
        if (!isPlaying || !track || !device?.is_active) return;

        const id = setInterval(() => setPosition(SpotifyStore.position ?? 0), 1000);
        return () => clearInterval(id);
    }, [track?.id, device?.id, device?.is_active, isPlaying]);

    if (!track || !device?.is_active) return null;

    const duration = track.duration ?? 0;
    const image = track.album?.image?.url;
    const artistNames = (track.artists ?? []).map((a: any) => a.name).join(", ");

    return (
        <div className={cl("menu-player")} style={{ "--vc-spotify-menu-icon-size": `${menuIconSize}px` } as React.CSSProperties}>
            <div className={cl("menu-player-main")}>
                <div className={cl("menu-player-track")}>
                    {image ? (
                        <img className={cl("menu-player-art")} src={image} alt="" draggable={false} />
                    ) : (
                        <div className={cl("menu-player-art", "menu-player-art-placeholder")}>♪</div>
                    )}

                    <div className={cl("menu-player-info")}>
                        <div className={cl("menu-player-title")} title={track.name}>{track.name}</div>
                        {artistNames && (
                            <div className={cl("menu-player-artist")} title={artistNames}>{artistNames}</div>
                        )}
                    </div>
                </div>

                <div className={cl("menu-player-center")}>
                    <div className={cl("menu-player-controls")}>
                        <ShuffleControl />
                        <Controls />
                        <RepeatControl />
                    </div>

                    <div className={cl("menu-player-seek")}>
                        <span className={cl("time-text")}>{msToHuman(position)}</span>

                        <div className={cl("menu-player-slider-wrap")}>
                            <SeekBar
                                className={cl("progress-slider")}
                                minValue={0}
                                maxValue={duration || 1}
                                initialValue={position}
                                asValueChanges={debounce(setPosition)}
                                onValueChange={debounce((v: number) => SpotifyStore.seek(v))}
                                onValueRender={msToHuman}
                            />
                        </div>

                        <span className={cl("time-text")}>{msToHuman(duration)}</span>
                    </div>
                </div>

                <div className={cl("menu-player-output")}>
                    <DeviceControl />
                    <VolumeControl />
                </div>
            </div>
        </div>
    );
}