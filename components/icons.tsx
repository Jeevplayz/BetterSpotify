/*
 * Vencord, a modification for Discord's desktop app
 * GPL v3
 */

import {
    ConnectDeviceIcon as DiscordConnectDeviceIcon,
    ConnectDeviceMobileIcon as DiscordConnectDeviceMobileIcon,
    MobileIcon as DiscordMobileIcon,
    PauseIcon,
    PlayIcon,
    RepeatIcon as DiscordRepeatIcon,
    RepeatOffIcon as DiscordRepeatOffIcon,
    RepeatOneIcon as DiscordRepeatOneIcon,
    ShuffleIcon as DiscordShuffleIcon,
    ShuffleOffIcon as DiscordShuffleOffIcon,
    SkipNextIcon,
    SkipPrevIcon,
    VolumeHighIcon,
    VolumeLowIcon,
    VolumeMutedIcon
} from "@components/Icons";
import { classNameFactory } from "@api/Styles";

const cl = classNameFactory("vc-spotify-");

function wrapIcon(Component: any, label: string) {
    return function BetterSpotifyIcon() {
        return <Component className={cl("button-icon", label)} aria-label={label} focusable={false} />;
    };
}

export const PlayButton = wrapIcon(PlayIcon, "play");
export const PauseButton = wrapIcon(PauseIcon, "pause");
export const SkipPrev = wrapIcon(SkipPrevIcon, "previous");
export const SkipNext = wrapIcon(SkipNextIcon, "next");
export const VolumeMuted = wrapIcon(VolumeMutedIcon, "volume-muted");
export const VolumeLow = wrapIcon(VolumeLowIcon, "volume-low");
export const VolumeHigh = wrapIcon(VolumeHighIcon, "volume-high");
export const ConnectDeviceIcon = wrapIcon(DiscordConnectDeviceIcon, "connect-device");
export const ConnectDeviceMobileIcon = wrapIcon(DiscordConnectDeviceMobileIcon, "connect-device-mobile");
export const MobileIcon = wrapIcon(DiscordConnectDeviceMobileIcon, "mobile");
export const ShuffleIcon = wrapIcon(DiscordShuffleIcon, "shuffle");
export const ShuffleOffIcon = wrapIcon(DiscordShuffleOffIcon, "shuffle-off");
export const RepeatIcon = wrapIcon(DiscordRepeatIcon, "repeat");
export const RepeatOneIcon = wrapIcon(DiscordRepeatOneIcon, "repeat-one");
export const RepeatOffIcon = wrapIcon(DiscordRepeatOffIcon, "repeat-off");
export const PhoneIcon = wrapIcon(DiscordMobileIcon, "phone");