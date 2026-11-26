/*
 * Vencord, a modification for Discord's desktop app
 * GPL v3
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";
import { React } from "@webpack/common";
import { SettingsTabs } from "./components/SettingsTabs";

/**
 * Accepts hex, rgb()/rgba(), a CSS var() reference (so a Discord theme variable like
 * var(--text-normal) can be used to track the active Discord theme), or "transparent";
 * otherwise returns an error string for the settings UI.
 */
const hexOrNamed = (v: string) =>
    /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v) ||
    v === "transparent" ||
    v.startsWith("rgba(") ||
    v.startsWith("rgb(") ||
    v.startsWith("var(") ||
    "Enter a valid hex color (e.g. #1ed760), rgb()/rgba(), var(--discord-variable), or \"transparent\"";

const optionalHexColor = (v: string) =>
    v === "" || /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v) ||
    "Enter a hex color beginning with #, or leave blank to use the Discord theme color.";

const colorOrEmpty = (v: string) => v === "" || hexOrNamed(v);

export const settings = definePluginSettings({
    settingsTabs: {
        type: OptionType.COMPONENT,
        component: () => React.createElement(SettingsTabs)
    },

    spotifyClientId: {
        type: OptionType.STRING,
        description:
            "Spotify Developer Client ID. Do not enter a Client Secret.",
        default: "",
        hidden: true
    },

    spotifyAccessToken: {
        type: OptionType.STRING,
        description: "",
        default: "",
        hidden: true
    },

    spotifyRefreshToken: {
        type: OptionType.STRING,
        description: "",
        default: "",
        hidden: true
    },

    spotifyTokenExpiresAt: {
        type: OptionType.NUMBER,
        description: "",
        default: 0,
        hidden: true
    },

    spotifyScopeVersion: {
        type: OptionType.NUMBER,
        description: "",
        default: 0,
        hidden: true
    },

    spotifyCodeVerifier: {
        type: OptionType.STRING,
        description: "",
        default: "",
        hidden: true
    },

    spotifyOAuthState: {
        type: OptionType.STRING,
        description: "",
        default: "",
        hidden: true
    },

    useSpotifyUris: {
        type: OptionType.BOOLEAN,
        description:
            "Open Spotify URIs instead of Spotify URLs. Requires Spotify installed.",
        default: false,
        hidden: true
    },

    previousButtonRestartsTrack: {
        type: OptionType.BOOLEAN,
        description:
            "Restart currently playing track when pressing previous if playtime >3s",
        default: true,
        hidden: true
    },

    showSeekBar: {
        type: OptionType.BOOLEAN,
        description:
            "Show a draggable seek bar to scrub through the track. Turn off to go back to plain elapsed / total time text.",
        default: true,
        hidden: true
    },

    showLyricsPreview: {
        type: OptionType.BOOLEAN,
        description: "Show the current and upcoming synced lyric below the mini-player.",
        default: true,
        hidden: true
    },

    lyricsPreviewFontSize: {
        type: OptionType.SLIDER,
        displayName: "Lyrics Preview Font Size",
        description: "Font size in pixels for the current and upcoming lyrics below the mini-player.",
        markers: [10, 12, 14, 16, 18],
        default: 12,
        stickToMarkers: true,
        hidden: true
    },
    lyricsPreviewLineCount: {
        type: OptionType.SLIDER,
        displayName: "Lyrics Preview Lines",
        description: "Number of lyric lines shown around the current line (1–10).",
        markers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        default: 3,
        stickToMarkers: true,
        hidden: true
    },
    lyricsPreviewEnglishLineHeight: {
        type: OptionType.NUMBER,
        displayName: "English Lyrics Line Height",
        description: "Line height for English lyrics (0–5; decimals allowed).",
        default: 1,
        hidden: true
    },
    lyricsPreviewHindiLineHeight: {
        type: OptionType.NUMBER,
        displayName: "Hindi Lyrics Line Height",
        description: "Line height for Hindi lyrics (0–5; decimals allowed).",
        default: 1.5,
        hidden: true
    },
    lyricsTextColor: {
        type: OptionType.STRING,
        displayName: "Lyrics Text Color",
        description: "Lyrics text color in the Spotify menu and mini-player preview. Leave blank to use the current Discord theme color.",
        placeholder: "Default: BetterSpotify theme text color",
        default: "",
        isValid: optionalHexColor,
        hidden: true
    },

    lyricsGlowColor: {
        type: OptionType.STRING,
        displayName: "Lyrics Glow Color",
        description: "Highlight color for the currently playing lyric in the Spotify menu and mini-player preview. Leave blank to use the current Discord theme color.",
        placeholder: "Default: Discord theme highlight color",
        default: "",
        isValid: optionalHexColor,
        hidden: true
    },

    menuAccentColor: {
        type: OptionType.STRING,
        displayName: "Spotify Menu Accent Color",
        description: "Color for accents inside the Spotify menu only. Enter a hex color beginning with #, or leave blank to use Discord's default blue accent.",
        placeholder: "Default: Discord theme blue accent",
        default: "",
        isValid: optionalHexColor,
        hidden: true
    },

    autoplayFallback: {
        type: OptionType.BOOLEAN,
        description:
            "If a track finishes and playback just stops (queue/context empty, Spotify's own Autoplay off), " +
            "automatically start a random track from your Liked Songs instead of leaving it stopped.",
        default: true,
        hidden: true
    },

    fontFamily: {
        type: OptionType.SELECT,
        description: "Font used for the player's text",
        options: [
            {
                label: "Discord Default",
                value: "inherit",
                default: true
            },
            {
                label: "Sans Serif",
                value: "'gg sans', 'Helvetica Neue', Helvetica, Arial, sans-serif"
            },
            {
                label: "Serif",
                value: "Georgia, 'Times New Roman', serif"
            },
            {
                label: "Monospace",
                value: "'Consolas', 'Courier New', monospace"
            },
            {
                label: "Rounded",
                value: "'Varela Round', 'Segoe UI Rounded', sans-serif"
            }
        ],
        hidden: true
    },

    fontSize: {
        type: OptionType.SLIDER,
        description: "Base font size (px) for the song title only",
        markers: [11, 12, 13, 14, 15, 16, 17, 18],
        default: 13,
        stickToMarkers: true,
        hidden: true
    },

    albumSize: {
        type: OptionType.SLIDER,
        description: "Album art size in pixels (20–50, adjustable in 1px steps)",
        markers: Array.from({ length: 31 }, (_, i) => i + 20),
        default: 42,
        stickToMarkers: true,
        hidden: true
    },

    menuIconSize: {
        type: OptionType.SLIDER,
        description: "Size of the shuffle, playback, and repeat icons in the Spotify menu (14–28px, adjustable in 1px steps).",
        markers: Array.from({ length: 15 }, (_, i) => i + 14),
        default: 18,
        stickToMarkers: true,
        hidden: true
    },

    accentColor: {
        type: OptionType.STRING,
        description: "Accent color used for the mini-player seek bar. Leave blank to use Discord's accent color.",
        placeholder: "Default: Discord theme accent color",
        default: "",
        isValid: colorOrEmpty,
        hidden: true
    },

    backgroundColor: {
        type: OptionType.STRING,
        description: "Player background color (hex, rgba(), var(--discord-variable), or \"transparent\"). Leave blank for transparent.",
        placeholder: "Default: Transparent",
        default: "",
        isValid: colorOrEmpty,
        hidden: true
    }
});
