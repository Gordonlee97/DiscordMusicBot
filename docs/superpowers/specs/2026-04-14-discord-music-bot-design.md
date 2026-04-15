# Discord Music Bot — Design Spec

**Date:** 2026-04-14
**Status:** Approved

---

## Overview

A personal Discord music bot for use with friends. Runs locally on the user's PC — no hosting required. Online when the user's machine is on, offline when it isn't. Not intended for commercial use or public distribution.

---

## Stack

| Layer | Package |
|---|---|
| Runtime | Node.js + TypeScript (strict mode) |
| Discord API | `discord.js` v14 |
| Voice | `@discordjs/voice` + `@discordjs/opus` |
| Music / Queue | `DisTube` v4 |
| Audio source | `@distube/yt-dlp` plugin |
| Spotify support | `@distube/spotify` (metadata only — resolves to YouTube) |
| Config | `dotenv` |

**Deployment:** Local PC only. No Docker, no hosting config. User runs `npm run dev` to bring the bot online.

---

## Project Structure

```
src/
  commands/           # one file per slash command
  events/
    distube/          # one file per DisTube event
    client/           # one file per discord.js event
  handlers/
    commandHandler.ts # auto-scans commands/, registers slash commands, attaches interactionCreate
    eventHandler.ts   # auto-scans events/, attaches each event to client or distube
  utils/
    embeds.ts         # all embed construction — single source of truth for visual style
    formatters.ts     # duration formatting, progress bar, queue position helpers
index.ts              # bootstrapper only — no logic
.env                  # secrets (not committed)
.env.example          # committed template showing required keys
```

---

## Architecture

### Handler Auto-Loading

`commandHandler.ts` scans `src/commands/` at startup, reads each file's `data` (SlashCommandBuilder) and `execute` function, registers commands with Discord, and attaches the `interactionCreate` listener to route incoming interactions.

`eventHandler.ts` scans `src/events/client/` and `src/events/distube/`, reads each file's `name` and `once` flag, and attaches listeners to the correct emitter (`client` or `distube`).

No manual registries — adding a file is enough to activate a command or event.

### Data Flow: `/play`

1. User runs `/play lo-fi beats` while in a voice channel
2. `interactionCreate` (client event) routes to `commands/play.ts`
3. `play.ts` validates user is in a voice channel, calls `distube.play(voiceChannel, query, { member, textChannel })`
4. DisTube emits `playSong` or `addSong` depending on queue state
5. `events/distube/playSong.ts` calls `embeds.nowPlaying()` and sends the embed to the text channel
6. DisTube manages the voice connection and audio stream — `@discordjs/voice` is never called directly

### Data Flow: `/playnext`

Identical to `/play` except DisTube is called with `position: 1` to insert the track at the front of the queue.

---

## Commands

| Command | Description |
|---|---|
| `/play [query]` | Adds to back of queue. Auto-joins user's voice channel. Accepts YouTube URL, Spotify URL, SoundCloud URL, or search terms |
| `/playnext [query]` | Adds to front of queue (plays after current track). Same input support as `/play`. If nothing playing, behaves like `/play` |
| `/skip` | Skips the current track |
| `/stop` | Stops playback. Queue remains intact |
| `/clear` | Clears the entire queue. Does not stop current track if playing |
| `/pause` | Pauses playback |
| `/resume` | Resumes playback |
| `/next [position]` | Moves track at the given queue position to play next. Position must be ≥ 2 and ≤ queue length |
| `/queue` | Shows current queue (up to 10 tracks) with total count and total duration |
| `/nowplaying` | Shows current track: title, duration, requester, text progress bar |

---

## DisTube Events Handled

| Event | Handler | Action |
|---|---|---|
| `playSong` | `events/distube/playSong.ts` | Send "Now Playing" embed (single track) |
| `addSong` | `events/distube/addSong.ts` | Send "Added to Queue" embed with queue position; cancel disconnect timer if running |
| `playList` | `events/distube/playList.ts` | Send "Now Playing" embed showing playlist name + first track |
| `addList` | `events/distube/addList.ts` | Send "Playlist Added" embed with name and track count; cancel disconnect timer if running |
| `finish` | `events/distube/finish.ts` | Send "Queue finished" embed; start 10-minute disconnect timer |
| `disconnect` | `events/distube/disconnect.ts` | Silent cleanup |
| `error` | `events/distube/error.ts` | Send error embed to text channel; never crash the process |

---

## Embed Design

**Accent color:** `#FF0000` (YouTube red)
All responses are embeds — never plain text. Errors are always ephemeral (only visible to the triggering user). Success responses are visible to the whole channel.

| Embed | Key Fields |
|---|---|
| Now Playing (track) | Thumbnail, title (hyperlinked), duration, requester |
| Now Playing (playlist) | Playlist name, first track title, total tracks, requester |
| Added to Queue | Title, duration, queue position |
| Playlist Added | Playlist name, track count, requester |
| Queue | Numbered list (up to 10 tracks), total count, total duration |
| Now Playing command | Same as Now Playing + text progress bar (e.g. `━━━━●───── 1:23 / 3:42`) |
| Error | Red accent, user-friendly message |

All embed construction lives exclusively in `utils/embeds.ts`. Event files and command files never build embeds inline.

---

## Error Handling

- **User not in a voice channel:** ephemeral reply — "You need to be in a voice channel first."
- **Nothing playing (skip/pause/resume/stop):** ephemeral reply — "Nothing is currently playing."
- **`/next` out of range:** ephemeral reply — "Position must be between 2 and [queue length]."
- **YouTube "sign in" block:** ephemeral reply — "YouTube is blocking this request. Try again in a moment."
- **Every `execute()` function:** wrapped in `try/catch` — unexpected errors reply ephemerally with a sanitized message and are logged to console.
- **DisTube `error` event:** always handled — sends error embed to text channel, logs to console. Never left unhandled (unhandled DisTube errors crash the process).

---

## Configuration (`.env`)

```
DISCORD_TOKEN=        # bot token from Discord Developer Portal
CLIENT_ID=            # application ID from Discord Developer Portal
GUILD_ID=             # your Discord server ID (for instant slash command registration during dev)
COOKIES_FROM_BROWSER=chrome  # passed to YtDlpPlugin to bypass YouTube sign-in blocks
```

`GUILD_ID` is used to register slash commands to a single server instantly during development (global registration takes up to 1 hour to propagate).

---

## Voice Channel Lifecycle

DisTube is configured with:
- `leaveOnEmpty: true` — bot auto-disconnects when the voice channel has no human members
- `leaveOnFinish: false` — handled manually (see below)
- `leaveOnStop: false` — `/stop` pauses playback but keeps the bot in the channel (queue intact, user can `/resume` or `/play` again)

**Queue-finish buffer:** When the `finish` event fires, the bot sends a "Queue finished" embed and starts a 10-minute countdown before disconnecting. If any new song is added (`addSong` / `addList`) before the timer expires, the timer is cancelled and the bot stays. If the timer fires, the bot disconnects. This gives users time to queue more songs without the bot abruptly leaving.

The active disconnect timer is stored as a module-level variable in `events/distube/finish.ts` and cleared in `events/distube/addSong.ts` and `events/distube/addList.ts`.

---

## Code Standards

- TypeScript strict mode throughout
- One command per file, one event per file
- Event files contain no logic beyond delegating to a handler or calling an embed utility
- Errors caught and replied gracefully — never silently swallowed
- No logic in `index.ts` — bootstrapper only
- `@discordjs/voice` never called directly — DisTube manages the voice connection
