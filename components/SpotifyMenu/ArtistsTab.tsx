/*
 * Vencord, a modification for Discord's desktop app
 * GPL v3
 */

import { React, TextInput, useState } from "@webpack/common";

import { SpotifyArtist, SpotifyStore } from "../../SpotifyStore";
import { useAsyncResource } from "./hooks";
import { ArtistGrid, LoadingMessage, StatusMessage } from "./rows";

export function ArtistsTab({ onOpenArtist }: { onOpenArtist: (artist: SpotifyArtist) => void; }) {
    const [filter, setFilter] = useState("");
    const [unfollowedIds, setUnfollowedIds] = useState<Set<string>>(() => new Set());
    const artists = useAsyncResource<SpotifyArtist[]>(
        () => SpotifyStore.getMyArtists(),
        [],
        [],
        "Failed to load followed artists:"
    );

    const needle = filter.trim().toLocaleLowerCase();
    const followedArtists = artists.data.filter(artist => !unfollowedIds.has(artist.id));
    const visible = needle ? followedArtists.filter(artist => artist.name.toLocaleLowerCase().includes(needle)) : followedArtists;

    const refresh = () => {
        setUnfollowedIds(new Set());
        artists.reload();
    };

    return (
        <>
            <div className="vc-spotify-menu-toolbar">
                <div className="vc-spotify-menu-filter">
                    <TextInput value={filter} placeholder="Filter your artists" onChange={setFilter} />
                </div>
                <button type="button" className="vc-spotify-menu-refresh" onClick={refresh} title="Refresh">⟳</button>
            </div>

            <div className="vc-spotify-search-results-list">
                {artists.loading && <LoadingMessage label="Loading your followed artists..." />}
                {artists.error && <div className="vc-spotify-search-error">{artists.error}</div>}
                {!artists.loading && !artists.error && visible.length === 0 && (
                    <StatusMessage>
                        {followedArtists.length === 0 ? "You haven't followed any artists on Spotify yet." : "No artists match that filter."}
                    </StatusMessage>
                )}
                {!artists.loading && visible.length > 0 && (
                    <ArtistGrid
                        artists={visible.map(artist => ({ ...artist, isFollowed: true }))}
                        onOpenArtist={onOpenArtist}
                        onFollowChange={(artist, followed) => {
                            if (!followed) setUnfollowedIds(current => new Set(current).add(artist.id));
                        }}
                    />
                )}
            </div>
        </>
    );
}
