/*
 * Vencord, a modification for Discord's desktop app
 * GPL v3
 */

import { classes } from "@utils/misc";
import { React, TextInput, useState, useStateFromStores } from "@webpack/common";

import { SearchTrack, SimplePlaylist, SpotifyArtist, SpotifyStore } from "../../SpotifyStore";
import { ArtistGrid, LoadingMessage, PlaylistGrid, StatusMessage, TrackRow } from "./rows";

interface SearchResults {
    tracks: SearchTrack[];
    playlists: SimplePlaylist[];
    artists: (SpotifyArtist & { isFollowed?: boolean; })[];
}

const EMPTY: SearchResults = { tracks: [], playlists: [], artists: [] };

function useSpotifySearch() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResults>(EMPTY);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const requestId = React.useRef(0);

    const search = React.useCallback(async (searchQuery = query) => {
        const value = searchQuery.trim();

        if (!value) {
            requestId.current++;
            setResults(EMPTY);
            setSearched(false);
            setLoading(false);
            setError(null);
            return;
        }

        const currentRequest = ++requestId.current;
        setLoading(true);
        setSearched(true);
        setError(null);

        try {
            const nextResults = await SpotifyStore.search(value);
            if (requestId.current === currentRequest) setResults(nextResults);
        } catch (e: any) {
            console.error("[VibeCord] Spotify search failed:", e);
            if (requestId.current === currentRequest) {
                setResults(EMPTY);
                setError(e?.message || "Spotify search failed.");
            }
        } finally {
            if (requestId.current === currentRequest) setLoading(false);
        }
    }, [query]);

    React.useEffect(() => {
        const value = query.trim();
        requestId.current++;

        if (!value) {
            setResults(EMPTY);
            setSearched(false);
            setLoading(false);
            setError(null);
            return;
        }

        setResults(EMPTY);
        setSearched(false);
        setLoading(false);
        setError(null);

        const timeout = setTimeout(() => { void search(value); }, 350);
        return () => clearTimeout(timeout);
    }, [query, search]);

    return { query, setQuery, results, loading, searched, error, search };
}

export function SearchTab({ onOpenPlaylist }: { onOpenPlaylist: (playlist: SimplePlaylist) => void; }) {
    const s = useSpotifySearch();
    const recentlyPlayed = useStateFromStores([SpotifyStore], () => SpotifyStore.recentlyPlayed);
    const isEmpty = s.results.tracks.length === 0 && s.results.playlists.length === 0 && s.results.artists.length === 0;

    return (
        <>
            <div className="vc-spotify-search-bar">
                <div className="vc-spotify-search-bar-icon">⌕</div>

                <div className="vc-spotify-search-bar-input">
                    <TextInput
                        autoFocus
                        value={s.query}
                        placeholder="Search songs, artists and playlists"
                        onChange={s.setQuery}
                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                            if (e.key === "Enter") s.search();
                        }}
                    />
                </div>

                {s.query && (
                    <button type="button" className="vc-spotify-search-bar-clear" onClick={() => s.setQuery("")}>×</button>
                )}

                <div className="vc-spotify-search-bar-divider" />

                <button
                    type="button"
                    className={classes("vc-spotify-search-submit", s.loading && "is-loading")}
                    onClick={() => { void s.search(); }}
                    disabled={s.loading}
                >
                    {s.loading ? "Searching..." : "Search"}
                </button>
            </div>

            <div className="vc-spotify-search-results-list">
                {s.loading && <LoadingMessage label="Searching Spotify..." />}

                {s.error && <div className="vc-spotify-search-error">{s.error}</div>}

                {!s.query.trim() && !s.loading && !recentlyPlayed.length && <StatusMessage>Search for a song, artist or playlist</StatusMessage>}

                {!s.query.trim() && !s.loading && recentlyPlayed.length > 0 && (
                    <>
                        <div className="vc-spotify-menu-section-title">Recently Played</div>
                        {recentlyPlayed.map(track => <TrackRow key={track.id} track={track} />)}
                    </>
                )}

                {s.query.trim() && !s.searched && !s.loading && <StatusMessage>Search for a song, artist or playlist</StatusMessage>}

                {s.searched && !s.loading && !s.error && isEmpty && <StatusMessage>No results found.</StatusMessage>}

                {!s.loading && s.results.playlists.length > 0 && (
                    <>
                        <div className="vc-spotify-menu-section-title">Playlists</div>
                        <PlaylistGrid playlists={s.results.playlists} onOpen={onOpenPlaylist} horizontal />
                    </>
                )}

                {!s.loading && s.results.artists.length > 0 && (
                    <>
                        <div className="vc-spotify-menu-section-title">Artists</div>
                        <ArtistGrid artists={s.results.artists} horizontal />
                    </>
                )}

                {!s.loading && s.results.tracks.length > 0 && (
                    <>
                        <div className="vc-spotify-menu-section-title">Songs</div>
                        {s.results.tracks.map(track => <TrackRow key={track.id} track={track} />)}
                    </>
                )}
            </div>
        </>
    );
}
