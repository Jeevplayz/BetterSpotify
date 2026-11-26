/*
 * Vencord, a modification for Discord's desktop app
 * GPL v3
 */

import ErrorBoundary from "@components/ErrorBoundary";
import definePlugin from "@utils/types";
import { Player } from "./PlayerComponent";
import { useStateFromStores } from "@webpack/common";
import { SpotifyStore } from "./SpotifyStore";
import { settings } from "./settings";

function PlayerWrapper() {
    const track = useStateFromStores([SpotifyStore], () => SpotifyStore.track);
    const device = useStateFromStores([SpotifyStore], () => SpotifyStore.device);

    if (!track || !device?.is_active) return null;

    return (
        <div id="vc-spotify-player">
            <Player />
        </div>
    );
}

export default definePlugin({
    name: "BetterSpotify",
    description: "Adds a Spotify player above the account panel",
    authors: [{ name: "JellyBean", id: 714707216879583242n }],

    settings,

    patches: [
        // Render above Discord's account panel.
        {
            find: /userTag:\w+,occluded:/,
            replacement: {
                match: /(?<=\i\.jsxs?\)\()(\i),{(?=[^}]*?userTag:\i,occluded:)/,
                replace: "$self.PanelWrapper,{VencordOriginal:$1,"
            }
        },

        // Add POST support for Spotify requests and return the actual API response.
        {
            find: ".PLAYER_DEVICES",
            replacement: [
                {
                    match: /get:(\i)\.bind\(null,(\i\.\i)\.get\)/,
                    replace: "post:$1.bind(null,$2.post),vcSpotifyMarker:1,$&"
                },
                {
                    match: /202===\i\.status/,
                    replace: "false"
                }
            ]
        },

        // Restore shuffle/repeat state and keep the current artist in search results.
        {
            find: 'repeat:"off"!==',
            replacement: [
                {
                    match: /repeat:"off"!==(\i),/,
                    replace: "shuffle:arguments[2]?.shuffle_state??false,actual_repeat:$1,$&"
                },
                {
                    match: /(?<=artists\.filter\(\i=>).{0,20}\i\.id\)&&/,
                    replace: ""
                }
            ]
        }
    ],

    start() {
        console.log("[VibeCord] plugin loaded");
    },

    stop() {
        console.log("[VibeCord] plugin stopped");
    },

    PanelWrapper({ VencordOriginal, ...props }) {
        try {
            return (
                <>
                    <ErrorBoundary
                        fallback={() => (
                            <div id="vc-spotify-player">
                                <p>Failed to render Spotify player</p>
                                <p>Check console for errors</p>
                            </div>
                        )}
                    >
                        <PlayerWrapper />
                    </ErrorBoundary>

                    <VencordOriginal {...props} />
                </>
            );
        } catch (err) {
            console.error("[VibeCord] PanelWrapper crash:", err);
            return <VencordOriginal {...props} />;
        }
    }
});
