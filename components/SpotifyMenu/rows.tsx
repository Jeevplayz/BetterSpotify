/*
 * Vencord, a modification for Discord's desktop app
 * GPL v3
 */

import { classes } from "@utils/misc";
import { React } from "@webpack/common";

import { runWithToast } from "../../lib/asyncAction";
import { SearchTrack, SimplePlaylist, SpotifyArtist, SpotifyStore } from "../../SpotifyStore";

/** Returns available Spotify image URLs, preferring a thumbnail large enough for the UI. */
export function getImageCandidates(images: { url: string; width?: number; }[] | undefined): string[] {
    if (!images?.length) return [];

    const sorted = images
        .filter(image => typeof image.url === "string" && image.url.length > 0)
        .sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
    const preferred = sorted.find(image => (image.width ?? 0) >= 120) ?? sorted[sorted.length - 1];
    if (!preferred) return [];

    return [...new Set([preferred, ...sorted].map(image => image.url))];
}

export function pickImage(images: { url: string; width?: number; }[] | undefined): string | undefined {
    return getImageCandidates(images)[0];
}

/** Tries each Spotify-provided size, then renders the styled placeholder instead of a broken image. */
export function ArtworkImage({ images, className, placeholderClassName, placeholder, alt = "" }: {
    images: { url: string; width?: number; }[] | undefined;
    className: string;
    placeholderClassName: string;
    placeholder: React.ReactNode;
    alt?: string;
}) {
    const candidates = React.useMemo(() => getImageCandidates(images), [images]);
    const candidateKey = candidates.join("\n");
    const [index, setIndex] = React.useState(0);

    React.useEffect(() => setIndex(0), [candidateKey]);

    if (index >= candidates.length) {
        return <div className={placeholderClassName}>{placeholder}</div>;
    }

    return (
        <img
            className={className}
            src={candidates[index]}
            alt={alt}
            draggable={false}
            loading="lazy"
            decoding="async"
            onError={() => setIndex(current => current + 1)}
        />
    );
}
export function StatusMessage({ children }: { children: React.ReactNode; }) {
    return <div className="vc-spotify-search-status">{children}</div>;
}

export function LoadingMessage({ label }: { label: string; }) {
    return (
        <div className="vc-spotify-search-status">
            <span className="vc-spotify-search-spinner" />
            {label}
        </div>
    );
}

/** A single track row with play / queue actions. Used by search results and playlist detail alike. */
export function TrackRow({ track, onPlay }: { track: SearchTrack; onPlay?: () => Promise<any>; }) {
    const artistNames = (track.artists ?? []).map(a => a.name).join(", ");

    const play = () =>
        runWithToast(
            () => (onPlay ? onPlay() : SpotifyStore.playTrack(track.uri)),
            { success: `Playing ${track.name}`, failure: "Failed to play track" },
            "Failed to play track:"
        );

    const queue = () =>
        runWithToast(
            () => SpotifyStore.queueTrack(track.uri),
            { success: `Added ${track.name} to queue`, failure: "Failed to add track to queue" },
            "Failed to queue track:"
        );

    return (
        <div className="vc-spotify-search-result">
            <ArtworkImage
                images={track.album?.images}
                className="vc-spotify-search-result-art"
                placeholderClassName="vc-spotify-search-result-art-placeholder"
                placeholder="♪"
            />

            <div className="vc-spotify-search-result-info">
                <div className="vc-spotify-search-result-title" title={track.name}>{track.name}</div>
                <div className="vc-spotify-search-result-artists" title={artistNames}>{artistNames}</div>
            </div>

            <div className="vc-spotify-search-result-actions">
                <button type="button" className="vc-spotify-search-result-play" onClick={play}>
                    <span style={{ marginRight: 5 }}>▶</span>Play
                </button>

                <button type="button" className="vc-spotify-search-result-queue" onClick={queue}>
                    <span style={{ marginRight: 5, fontSize: 16 }}>+</span>Queue
                </button>
            </div>
        </div>
    );
}

/** A playlist tile: click to open its track list, or hit the play badge to start it straight away. */
export function PlaylistCard({ playlist, onOpen }: { playlist: SimplePlaylist; onOpen: () => void; }) {
    const total = playlist.tracks?.total;

    const subtitle = playlist.isLikedSongs
        ? `${total ?? 0} saved songs`
        : [playlist.owner?.display_name && `By ${playlist.owner.display_name}`, total != null && `${total} tracks`]
            .filter(Boolean)
            .join(" · ");

    const play = (e: React.MouseEvent) => {
        e.stopPropagation();

        runWithToast(
            () => SpotifyStore.playPlaylist(playlist),
            { success: `Playing ${playlist.name}`, failure: "Failed to play playlist" },
            "Failed to play playlist:"
        );
    };

    return (
        <div
            className="vc-spotify-playlist-card"
            role="button"
            tabIndex={0}
            onClick={onOpen}
            onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") onOpen();
            }}
        >
            <div className="vc-spotify-playlist-art-wrap">
                <ArtworkImage
                    images={playlist.images}
                    className="vc-spotify-playlist-art"
                    placeholderClassName={`vc-spotify-playlist-art vc-spotify-playlist-art-placeholder${playlist.isLikedSongs ? " is-liked" : ""}`}
                    placeholder={playlist.isLikedSongs ? "♥" : "♪"}
                />

                <button type="button" className="vc-spotify-playlist-play" title={`Play ${playlist.name}`} onClick={play}>▶</button>
            </div>

            <div className="vc-spotify-playlist-name" title={playlist.name}>{playlist.name}</div>
            <div className="vc-spotify-playlist-meta" title={subtitle}>{subtitle}</div>
        </div>
    );
}

export function PlaylistGrid({ playlists, onOpen, horizontal = false }: { playlists: SimplePlaylist[]; onOpen: (playlist: SimplePlaylist) => void; horizontal?: boolean; }) {
    const gridRef = React.useRef<HTMLDivElement>(null);
    React.useEffect(() => {
        if (!horizontal) return;
        const handleWheel = (event: WheelEvent) => {
            const target = event.target;
            if (!(target instanceof Element)) return;
            const results = target.closest<HTMLElement>(".vc-spotify-search-results-list");
            const element = results?.querySelector<HTMLElement>(".vc-spotify-playlist-grid.is-horizontal");
            if (!element) return;
            const rect = element.getBoundingClientRect();
            if (event.clientY < rect.top || event.clientY > rect.bottom) return;

            event.preventDefault();
            event.stopImmediatePropagation();
            const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
            const card = element.querySelector<HTMLElement>(".vc-spotify-playlist-card");
            const gap = parseFloat(getComputedStyle(element).columnGap || "0");
            const step = card ? card.getBoundingClientRect().width + gap : element.clientWidth;
            element.scrollBy({ left: Math.sign(delta) * step, behavior: "smooth" });
        };
        document.addEventListener("wheel", handleWheel, { passive: false, capture: true });
        return () => document.removeEventListener("wheel", handleWheel, true);
    }, [horizontal]);

    return (
        <div
            ref={gridRef}
            className={classes("vc-spotify-playlist-grid", horizontal && "is-horizontal")}
        >
            {playlists.map(playlist => (
                <PlaylistCard key={playlist.id} playlist={playlist} onOpen={() => onOpen(playlist)} />
            ))}
        </div>
    );
}

/** Artist tile, with a Spotify follow toggle on the right side of its image and name. */
export function ArtistCard({ artist, onFollowChange }: { artist: SpotifyArtist & { isFollowed?: boolean; }; onFollowChange?: (artist: SpotifyArtist, followed: boolean) => void; }) {
    const [busy, setBusy] = React.useState(false);
    const [followed, setFollowed] = React.useState(Boolean(artist.isFollowed));

    React.useEffect(() => setFollowed(Boolean(artist.isFollowed)), [artist.id, artist.isFollowed]);

    const toggleFollow = async (event: React.MouseEvent) => {
        event.stopPropagation();
        if (busy) return;
        const next = !followed;
        setBusy(true);
        try {
            await SpotifyStore.setArtistFollowed(artist, next);
            setFollowed(next);
            onFollowChange?.(artist, next);
        } catch (error) {
            console.error("[VibeCord] Failed to update followed artist:", error);
            const message = error instanceof Error ? error.message : "Spotify could not update this artist.";
            try {
                const { showToast } = await import("@webpack/common");
                showToast({ text: message, duration: 5000 });
            } catch { /* Keep the failed follow state unchanged. */ }
        } finally {
            setBusy(false);
        }
    };

    const openArtist = () => SpotifyStore.openExternal(`/artist/${artist.id}`);
    const handleCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openArtist();
        }
    };

    return (
        <div
            className="vc-spotify-artist-card"
            role="link"
            tabIndex={0}
            onClick={openArtist}
            onKeyDown={handleCardKeyDown}
            aria-label={`Open ${artist.name} on Spotify`}
        >
            <ArtworkImage
                images={artist.images}
                className="vc-spotify-artist-art"
                placeholderClassName="vc-spotify-artist-art vc-spotify-artist-placeholder"
                placeholder="♫"
                alt=""
            />
            <div className="vc-spotify-artist-info">
                <div className="vc-spotify-artist-name" title={artist.name}>{artist.name}</div>
                <div className="vc-spotify-artist-type">Artist</div>
            </div>
            <button
                type="button"
                className={classes("vc-spotify-artist-follow", followed && "is-following")}
                onClick={toggleFollow}
                disabled={busy}
                aria-pressed={followed}
            >
                {busy ? "…" : followed ? "Unfollow" : "Follow"}
            </button>
        </div>
    );
}

export function ArtistGrid({ artists, horizontal = false, onFollowChange }: {
    artists: (SpotifyArtist & { isFollowed?: boolean; })[];
    horizontal?: boolean;
    onFollowChange?: (artist: SpotifyArtist, followed: boolean) => void;
}) {
    const gridRef = React.useRef<HTMLDivElement>(null);
    React.useEffect(() => {
        if (!horizontal) return;
        const handleWheel = (event: WheelEvent) => {
            const target = event.target;
            if (!(target instanceof Element)) return;
            const results = target.closest<HTMLElement>(".vc-spotify-search-results-list");
            const element = results?.querySelector<HTMLElement>(".vc-spotify-artist-grid.is-horizontal");
            if (!element) return;
            const rect = element.getBoundingClientRect();
            if (event.clientY < rect.top || event.clientY > rect.bottom) return;

            event.preventDefault();
            event.stopImmediatePropagation();
            const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
            const card = element.querySelector<HTMLElement>(".vc-spotify-artist-card");
            const gap = parseFloat(getComputedStyle(element).gap || "0");
            const step = card ? card.getBoundingClientRect().width + gap : element.clientWidth;
            element.scrollBy({ left: Math.sign(delta) * step, behavior: "smooth" });
        };
        document.addEventListener("wheel", handleWheel, { passive: false, capture: true });
        return () => document.removeEventListener("wheel", handleWheel, true);
    }, [horizontal]);

    return (
        <div
            ref={gridRef}
            className={classes("vc-spotify-artist-grid", horizontal && "is-horizontal")}
        >
            {artists.map(artist => <ArtistCard key={artist.id} artist={artist} onFollowChange={onFollowChange} />)}
        </div>
    );
}
