# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Personal Discord music bot for a friend group. Runs locally on the user's PC (no hosting required). Music from YouTube (via yt-dlp), with Spotify and SoundCloud URL support via DisTube plugins.

## Commands

```
npm run dev     # Run bot in dev mode (tsx, no compile step)
npm run build   # Compile TypeScript to dist/
npm start       # Run compiled bot (node dist/index.js)
npm test        # Run Jest test suite
```

## Environment Setup

Copy `.env.example` to `.env` and fill in:
- `DISCORD_TOKEN` — bot token from Discord Developer Portal
- `CLIENT_ID` — application ID from Discord Developer Portal
- `GUILD_ID` — server ID (enables instant slash command registration; omit for global)

Also requires `yt-dlp` binary on PATH: `winget install yt-dlp` or `pip install yt-dlp`

## Stack

- **Runtime:** Node.js + TypeScript (strict mode), CommonJS modules
- **Discord:** discord.js v14, slash commands only (no prefix commands)
- **Music:** DisTube v5, @distube/yt-dlp@^2.x, @distube/spotify@^2.x
- **Voice:** @discordjs/voice, @discordjs/opus, ffmpeg-static (bundled FFmpeg)
- **Tests:** Jest + ts-jest (tests in `tests/`, sources in `src/`)

## Architecture

- `src/index.ts` — entry point: creates Client + DisTube, wires plugins, calls handlers
- `src/types.ts` — Command/ClientEvent/DistubeEvent interfaces + discord.js Client augment
- `src/handlers/` — auto-loading: scans `src/commands/` and `src/events/{client,distube}/`
- `src/commands/` — one file per slash command
- `src/events/client/` — discord.js client events (ready, interactionCreate)
- `src/events/distube/` — DisTube events (playSong, addSong, playList, addList, finish, disconnect, error)
- `src/utils/embeds.ts` — ALL EmbedBuilder construction lives here; never build embeds inline
- `src/utils/formatters.ts` — formatDuration(), progressBar()
- `src/utils/disconnectTimer.ts` — module-level singleton disconnect timer (single-guild)
- `src/utils/nowPlayingTracker.ts` — live now-playing embed updater (5s interval, keyed by guildId)
- `src/utils/searchPicker.ts` — search result picker state (pending selections, 30s timeout)
- `src/utils/playerButtons.ts` — builds the Pause/Resume/Skip/Stop button row for now-playing embeds

## Key Design Decisions

- `/stop` calls `queue.pause()` — no stop-without-clear in DisTube; queue is preserved
- `/clear` splices `queue.songs` from index 1; currently playing track stays at index 0
- Queue indexing: `songs[0]` = current, `songs[1]` = next; display position N = `songs[N]`
- `/next [position]` requires at least 2 queued tracks (songs.length ≥ 3), moves `songs[position]` to `songs[1]`
- 10-minute disconnect buffer: `setDisconnectTimer` in `finish` event, cancelled in `addSong`/`addList`
- Manual disconnect: `queue.voice.leave()`
- Commands defer+delete ephemeral reply for async ops; DisTube events send actual channel embeds
- Now-playing embed has live buttons (Pause/Resume/Skip/Stop); button interactions handled in `interactionCreate.ts`
- Button `player:pause` toggles pause/resume; `player:skip` defers and lets playSong fire; `player:stop` pauses
- `nowPlayingCommand(song, currentTime, repeatMode?)` — tracker passes `queue.repeatMode` so loop state shows live
- DisTube v5 plugin split: `YtDlpSearchPlugin` (ExtractorPlugin) handles text search; `@distube/yt-dlp` handles URLs only

## Commands Reference

| Command | Description |
|---|---|
| `/play [query]` | Play or queue a track/playlist |
| `/playnext [query]` | Queue a track at the front |
| `/skip` | Skip current track (requires next track in queue) |
| `/stop` | Pause playback, keep queue intact |
| `/pause` | Pause playback |
| `/resume` | Resume paused playback |
| `/clear` | Remove all queued tracks (keeps current) |
| `/next [position]` | Move queued track at position to play next |
| `/queue` | Show the current queue |
| `/nowplaying` | Show current track with progress bar |
| `/loop` | Cycle loop mode: off → song → queue → off |
| `/shuffle` | Shuffle the queue |
| `/seek [time]` | Jump to position in current track (e.g. `1:30`, `90`) |
