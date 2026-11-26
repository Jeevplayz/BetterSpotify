/*
 * Vencord, a modification for Discord's desktop app
 * GPL v3
 */

import { classNameFactory } from "@api/Styles";

const cl = classNameFactory("vc-spotify-");

interface IconShape {
    d: string;
    fill?: boolean;
    stroke?: boolean;
}

function wrapIcon(shapes: IconShape[], label: string) {
    return function BetterSpotifyIcon() {
        return (
            <svg className={cl("button-icon", label)} viewBox="0 0 24 24" aria-label={label} focusable="false">
                {shapes.map((shape, index) => (
                    <path
                        key={index}
                        d={shape.d}
                        fill={shape.fill ? "currentColor" : "none"}
                        stroke={shape.stroke ? "currentColor" : "none"}
                        strokeWidth={shape.stroke ? 2 : undefined}
                        strokeLinecap={shape.stroke ? "round" : undefined}
                        strokeLinejoin={shape.stroke ? "round" : undefined}
                    />
                ))}
            </svg>
        );
    };
}

const filled = (d: string): IconShape => ({ d, fill: true });
const line = (d: string): IconShape => ({ d, stroke: true });

export const PlayButton = wrapIcon([filled("M7 4.8a1 1 0 0 1 1.52-.85l11.1 6.7a1.6 1.6 0 0 1 0 2.7l-11.1 6.7A1 1 0 0 1 7 19.2z")], "play");
export const PauseButton = wrapIcon([filled("M6 4h4v16H6z"), filled("M14 4h4v16h-4z")], "pause");
export const SkipPrev = wrapIcon([filled("M5 5h2v14H5z"), filled("M19 5v14l-10-7z")], "previous");
export const SkipNext = wrapIcon([filled("M17 5h2v14h-2z"), filled("M5 5v14l10-7z")], "next");

const speaker = filled("M3 9v6h4l5 4V5L7 9z");
export const VolumeMuted = wrapIcon([speaker, line("m16 9 5 6"), line("m21 9-5 6")], "volume-muted");
export const VolumeLow = wrapIcon([speaker, line("M16 9a5 5 0 0 1 0 6")], "volume-low");
export const VolumeHigh = wrapIcon([speaker, line("M16 9a5 5 0 0 1 0 6"), line("M19 6a9 9 0 0 1 0 12")], "volume-high");

const connectDevice = [
    line("M3 4.5h13a1.5 1.5 0 0 1 1.5 1.5v8"),
    line("M3 4.5v12h9"),
    line("M7 20h3"),
    line("M5 16.5h5"),
    line("M16 15v-2.5a1.5 1.5 0 0 1 3 0V15"),
    line("M15 15h5v6h-5z")
];
export const ConnectDeviceIcon = wrapIcon(connectDevice, "connect-device");
export const ConnectDeviceMobileIcon = wrapIcon([
    line("M3 4.5h13a1.5 1.5 0 0 1 1.5 1.5v4"),
    line("M3 4.5v12h8"),
    line("M7 20h3"),
    line("M5 16.5h5"),
    line("M15 12h6v9h-6z"),
    filled("M17.5 19h1v1h-1z")
], "connect-device-mobile");
export const MobileIcon = wrapIcon([line("M7 3h10v18H7z"), filled("M11 18h2v2h-2z")], "mobile");
export const PhoneIcon = wrapIcon([line("M7 3h10v18H7z"), filled("M11 18h2v2h-2z")], "phone");

const shuffle = [
    line("M3 7h2.5c4.5 0 8 10 12 10H21"),
    line("M18 14l3 3-3 3"),
    line("M3 17h2.5c1.5 0 2.8-1.5 4-3"),
    line("M14 9c1.2-1.3 2.4-2 3.5-2H21"),
    filled("m18 4 3 3-3 3z")
];
export const ShuffleIcon = wrapIcon(shuffle, "shuffle");
export const ShuffleOffIcon = wrapIcon([...shuffle, line("M4 4l16 16")], "shuffle-off");

const repeat = [
    line("M17 2l4 4-4 4"),
    line("M3 11V8a2 2 0 0 1 2-2h16"),
    line("M7 22l-4-4 4-4"),
    line("M21 13v3a2 2 0 0 1-2 2H3")
];
export const RepeatIcon = wrapIcon(repeat, "repeat");
export const RepeatOneIcon = wrapIcon([...repeat, filled("M11 10h2v5h2v2h-6v-2h2z")], "repeat-one");
export const RepeatOffIcon = wrapIcon([...repeat, line("M4 4l16 16")], "repeat-off");
