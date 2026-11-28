/*
 * Vencord, a modification for Discord's desktop app
 * GPL v3
 */

import { SearchTrack, SpotifyArtist, SpotifyArtistAlbum, SpotifyStore } from "../../SpotifyStore";
import { useAsyncResource } from "./hooks";
import { ArtworkImage, LoadingMessage, StatusMessage, TrackRow } from "./rows";
import { useState } from "@webpack/common";

export function ArtistDetail({ artist, onBack }: { artist: SpotifyArtist; onBack: () => void; }) {
    const [selectedAlbum, setSelectedAlbum] = useState<SpotifyArtistAlbum | null>(null);
    const albums = useAsyncResource<SpotifyArtistAlbum[]>(
        () => SpotifyStore.getArtistAlbums(artist.id),
        [],
        [artist.id],
        "Failed to load artist albums:"
    );
    const tracks = useAsyncResource<SearchTrack[]>(
        () => selectedAlbum ? SpotifyStore.getAlbumTracks(selectedAlbum) : Promise.resolve([]),
        [],
        [selectedAlbum?.id],
        "Failed to load album tracks:",
        Boolean(selectedAlbum)
    );

    return (
        <>
            <div className="vc-spotify-detail-header">
                <button type="button" className="vc-spotify-menu-back" onClick={onBack} title="Back">‹</button>
                <ArtworkImage images={artist.images} className="vc-spotify-detail-art" placeholderClassName="vc-spotify-detail-art vc-spotify-playlist-art-placeholder" placeholder="♫" />
                <div className="vc-spotify-detail-info">
                    <div className="vc-spotify-detail-name" title={artist.name}>{artist.name}</div>
                    <div className="vc-spotify-detail-meta">Artist</div>
                </div>
                <button type="button" className="vc-spotify-detail-play" onClick={() => SpotifyStore.openExternal(`/artist/${artist.id}`)}>Open in Spotify</button>
            </div>

            {selectedAlbum ? (
                <>
                    <div className="vc-spotify-detail-header vc-spotify-album-detail-header">
                        <button type="button" className="vc-spotify-menu-back" onClick={() => setSelectedAlbum(null)} title="Back to albums">‹</button>
                        <ArtworkImage images={selectedAlbum.images} className="vc-spotify-detail-art" placeholderClassName="vc-spotify-detail-art vc-spotify-playlist-art-placeholder" placeholder="♫" />
                        <div className="vc-spotify-detail-info">
                            <div className="vc-spotify-detail-name" title={selectedAlbum.name}>{selectedAlbum.name}</div>
                            <div className="vc-spotify-detail-meta">{selectedAlbum.album_type}{selectedAlbum.release_date ? ` · ${selectedAlbum.release_date.slice(0, 4)}` : ""}</div>
                        </div>
                    </div>
                    <div className="vc-spotify-search-results-list">
                        {tracks.loading && <LoadingMessage label="Loading tracks..." />}
                        {tracks.error && <div className="vc-spotify-search-error">{tracks.error}</div>}
                        {!tracks.loading && !tracks.error && tracks.data.length === 0 && <StatusMessage>No tracks found.</StatusMessage>}
                        {!tracks.loading && tracks.data.map((track, index) => (
                            <TrackRow key={`${track.id}-${index}`} track={track} onPlay={() => SpotifyStore.playContext(selectedAlbum.uri, track.uri)} />
                        ))}
                    </div>
                </>
            ) : <div className="vc-spotify-search-results-list">
                {albums.loading && <LoadingMessage label="Loading albums..." />}
                {albums.error && <div className="vc-spotify-search-error">{albums.error}</div>}
                {!albums.loading && !albums.error && albums.data.length === 0 && <StatusMessage>No albums found.</StatusMessage>}
                {!albums.loading && albums.data.map(album => (
                    <button key={album.id} type="button" className="vc-spotify-artist-album-row" onClick={() => setSelectedAlbum(album)}>
                        <ArtworkImage images={album.images} className="vc-spotify-search-result-art" placeholderClassName="vc-spotify-search-result-art-placeholder" placeholder="♫" />
                        <span className="vc-spotify-artist-album-info">
                            <span className="vc-spotify-search-result-title">{album.name}</span>
                            <span className="vc-spotify-search-result-artists">{album.album_type}{album.release_date ? ` · ${album.release_date.slice(0, 4)}` : ""}</span>
                        </span>
                        <span className="vc-spotify-artist-album-open">View tracks</span>
                    </button>
                ))}
            </div>}
        </>
    );
}
