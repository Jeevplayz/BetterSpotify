# BetterSpotify

**A Spotify player built directly into Discord using [Vencord](https://vencord.dev/).**

BetterSpotify adds a compact Spotify player above Discord's account panel, with playback controls, playlist browsing, artist library, music search, and lyrics — so you can manage your music without leaving Discord.

## Features

### Mini Player
- Displays the currently playing track, artist, and album artwork.
- Play, pause, skip, and previous-track controls.
- Volume control and draggable seek bar.
- Optional lyrics preview below the player, showing the current and upcoming lines.
- Automatically hides when there is no active Spotify playback device.

### Spotify Menu
Open the Spotify menu from the player to access:

- **Your Playlists** — browse your Spotify playlists and Liked Songs, open playlists, and play their tracks.
- **Your Artists** — view and manage followed artists.
- **Search** — search Spotify for tracks, playlists, and artists.
- **Lyrics** — view available synced or plain lyrics for the current track.

### Playback Features
- Shuffle and repeat controls.
- Transfer playback to an available Spotify device.
- Optional autoplay fallback: when playback stops because the queue or context is empty, BetterSpotify can start a random track from Liked Songs.
- Option to restart the current track when pressing Previous if it has played for more than three seconds.

### Customization
Customize the player and lyrics experience through the plugin settings:

- Font family and title font size.
- Album artwork size.
- Player accent and background colors.
- Show or hide the seek bar.
- Enable or disable the mini-player lyrics preview.
- Adjust lyrics preview font size and number of displayed lines.
- Customize lyrics text, highlight, and Spotify menu accent colors.

## Requirements

- [Vencord](https://github.com/Vendicated/Vencord) installed.
- A Spotify account. **Spotify Premium is required for Spotify playback control.**
- A Spotify Developer app and its Client ID.
- Python is optional. Install the `syncedlyrics` package if you want to enable the optional synced-lyrics fallback.

## Installation

1. Open your Vencord source directory.
2. Clone BetterSpotify into `src/userplugins/`:

   ```bash
   git clone https://github.com/Jeevplayz/BetterSpotify.git src/userplugins/BetterSpotify
   ```

   If you have already downloaded the repository, place its `BetterSpotify` plugin folder inside `src/userplugins/`.

3. From the Vencord source directory, build and inject Vencord:

   ```bash
   pnpm build
   pnpm inject
   ```

4. Restart Discord.
5. Open **Vencord Settings → Plugins** and enable **BetterSpotify**.

> The clone command assumes the GitHub repository is named `BetterSpotify` under `Jeevplayz`. Change the URL if you host the repository elsewhere.

## Spotify Setup

BetterSpotify connects directly to Spotify using OAuth Authorization Code with PKCE. You need to create your own Spotify Developer app.

### 1. Create a Spotify Developer App

1. Open the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Log in with your Spotify account.
3. Select **Create app**.
4. Enter an app name and description.

### 2. Add the Redirect URI

In your app settings, add this exact address under **Redirect URIs**:

```text
http://127.0.0.1:43821/callback
```

Save your changes.

### 3. Copy Your Client ID

Copy the **Client ID** from your Spotify Developer app.

**Do not use or enter your Client Secret. BetterSpotify only needs the Client ID.**

### 4. Enter Your Client ID in BetterSpotify

In Discord:

1. Open **Vencord Settings**.
2. Go to **Plugins**.
3. Open **BetterSpotify**.
4. Find the Spotify connection setup in the plugin's **General** settings.
5. Paste your Spotify Developer **Client ID** and save it.

### 5. Connect Your Spotify Account

1. Open the BetterSpotify menu from the mini-player.
2. Select **Connect Spotify**.
3. Your browser will open the Spotify authorization page.
4. Log in and approve the requested permissions.
5. After authorization, your browser will redirect to:

   ```text
   http://127.0.0.1:43821/callback
   ```

6. Copy the **complete callback URL** from your browser's address bar.
7. Paste it into BetterSpotify to finish connecting your account.

Once connected, you can browse your library and control playback from Discord.

## Settings

BetterSpotify organizes its settings into three sections:

| Section | Setting | Description |
|---|---|---|
| General | Spotify Client ID | Client ID from your Spotify Developer app. |
| General | Open Spotify URIs instead of URLs | Open Spotify links in the Spotify desktop app. Requires Spotify installed. |
| General | Restart track on Previous | Restart the current track when it has played for more than three seconds. |
| General | Show Seek Bar | Display a draggable progress bar instead of elapsed and total time. |
| General | Autoplay Fallback | Start a random Liked Song when playback stops with an empty queue or context. |
| Lyrics | Show Lyrics Preview | Show current and upcoming synced lyrics below the mini-player. |
| Lyrics | Lyrics Preview Font Size | Adjust the lyrics preview text size. |
| Lyrics | Lyrics Preview Lines | Choose how many lyric lines are displayed around the current line. |
| Lyrics | Lyrics Text Color | Customize lyrics text color. |
| Lyrics | Lyrics Glow Color | Customize the active lyric highlight color. |
| Lyrics | Spotify Menu Accent Color | Customize accent colors inside the Spotify menu. |
| Appearance | Font Family | Choose the player's font. |
| Appearance | Title Font Size | Adjust the track title size. |
| Appearance | Album Art Size | Adjust the album artwork thumbnail size. |
| Appearance | Player Accent Color | Customize the mini-player seek bar accent. |
| Appearance | Player Background Color | Customize the mini-player background. |

Leave optional color fields blank to use the default Discord theme colors.

## Lyrics

Lyrics are retrieved from [LRCLIB](https://lrclib.net/), a free community lyrics database.

BetterSpotify supports:
- Synced lyrics.
- Plain lyrics.
- Current-line highlighting and a mini-player lyrics preview.
- Enhanced word-level synchronization when available.

Lyrics availability and synchronization depend on the data available from the lyrics providers. Some tracks may not have lyrics.

### Optional Synced-Lyrics Fallback

BetterSpotify can use the Python `syncedlyrics` package as an additional source for synced lyrics.

Install it with:

```bash
python -m pip install syncedlyrics
```

This fallback is optional. If Python or the package is unavailable, BetterSpotify can still use LRCLIB.

## Spotify API Limitations

Spotify may restrict access to certain endpoints or playlist types for third-party applications. Some Spotify-generated algorithmic playlists — such as Daily Mix, Discover Weekly, and Release Radar — may not be available through the Spotify API, depending on Spotify's current app access policies.

These restrictions are controlled by Spotify and are not necessarily BetterSpotify bugs.

## Troubleshooting

- **Spotify will not connect:** Check that the Client ID is correct and that the Redirect URI exactly matches `http://127.0.0.1:43821/callback`.
- **Authorization does not complete:** Copy the full callback URL, including its query parameters, and paste it into BetterSpotify.
- **Playlist or artist data is missing:** Check the permissions requested during Spotify authorization. Disconnect and reconnect if the plugin asks for additional permissions.
- **Playback controls do not work:** Make sure Spotify has an active playback device and that your account has the required Premium subscription.
- **Lyrics are unavailable:** The track may not be listed by LRCLIB or the optional fallback provider.

## Credits

- **Author:** JellyBean
- Built on [Vencord](https://vencord.dev/).
- Lyrics provided by [LRCLIB](https://lrclib.net/).
- Optional synced-lyrics fallback powered by [`syncedlyrics`](https://github.com/moehmeni/syncedlyrics).

## License

BetterSpotify is licensed under the **GNU General Public License v3.0 (GPL-3.0)**, in line with Vencord's license.

See [LICENSE](LICENSE) for the full license text.
