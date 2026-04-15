# Discord Music Bot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a clean, self-hosted Discord music bot that plays YouTube/Spotify/SoundCloud audio in voice channels via slash commands.

**Architecture:** Auto-loading handlers scan `src/commands/` and `src/events/` at startup — no manual registries. All embed construction lives in `src/utils/embeds.ts`. DisTube owns the voice connection and queue; commands validate input and call DisTube, events send the Discord responses.

**Tech Stack:** Node.js, TypeScript (strict), discord.js v14, DisTube v4, @distube/yt-dlp, @distube/spotify, dotenv, Jest + ts-jest

---

## File Map

| File | Role |
|---|---|
| `package.json` | Dependencies, scripts |
| `tsconfig.json` | TypeScript strict config |
| `jest.config.js` | Jest + ts-jest config |
| `.env.example` | Config template |
| `src/types.ts` | Command/Event interfaces, Client augmentation |
| `src/index.ts` | Bootstrapper only — no logic |
| `src/handlers/commandHandler.ts` | Scan commands/, register slash commands, store in client.commands |
| `src/handlers/eventHandler.ts` | Scan events/client/ and events/distube/, attach listeners |
| `src/utils/formatters.ts` | Pure functions: formatDuration, progressBar |
| `src/utils/embeds.ts` | All EmbedBuilder factories — single source of truth |
| `src/utils/disconnectTimer.ts` | Module-level setTimeout for post-queue disconnect |
| `src/events/client/ready.ts` | Log bot online |
| `src/events/client/interactionCreate.ts` | Route slash commands to command files |
| `src/events/distube/playSong.ts` | Send "Now Playing" embed (single track) |
| `src/events/distube/addSong.ts` | Send "Added to Queue" embed; cancel disconnect timer |
| `src/events/distube/playList.ts` | Send "Now Playing" embed (playlist) |
| `src/events/distube/addList.ts` | Send "Playlist Added" embed; cancel disconnect timer |
| `src/events/distube/finish.ts` | Send "Queue Finished" embed; start 10-min disconnect timer |
| `src/events/distube/disconnect.ts` | Silent cleanup |
| `src/events/distube/error.ts` | Send error embed to text channel |
| `src/commands/play.ts` | Add to back of queue |
| `src/commands/playnext.ts` | Add to front of queue |
| `src/commands/skip.ts` | Skip current track |
| `src/commands/stop.ts` | Stop playback, keep queue |
| `src/commands/clear.ts` | Clear queue, keep current track |
| `src/commands/pause.ts` | Pause playback |
| `src/commands/resume.ts` | Resume playback |
| `src/commands/next.ts` | Move track at position N to play next |
| `src/commands/queue.ts` | Show queue embed |
| `src/commands/nowplaying.ts` | Show now-playing embed with progress bar |
| `tests/utils/formatters.test.ts` | Unit tests for formatters |
| `tests/utils/disconnectTimer.test.ts` | Unit tests for disconnect timer |

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `jest.config.js`
- Create: `.env.example`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "discord-music-bot",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest"
  },
  "dependencies": {
    "@discordjs/opus": "^0.9.0",
    "@discordjs/voice": "^0.17.0",
    "@distube/spotify": "^2.0.0",
    "@distube/yt-dlp": "^2.0.0",
    "discord.js": "^14.16.0",
    "distube": "^4.2.0",
    "dotenv": "^16.4.0",
    "ffmpeg-static": "^5.2.0"
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/node": "^20.0.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "sourceMap": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Create jest.config.js**

```js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
};
```

- [ ] **Step 4: Create .env.example**

```
DISCORD_TOKEN=          # Bot token — Discord Developer Portal > Your App > Bot
CLIENT_ID=              # Application ID — Discord Developer Portal > Your App > General Information
GUILD_ID=               # Your server ID — right-click server icon > Copy Server ID (enables instant command registration)
COOKIES_FROM_BROWSER=chrome  # Browser to pull YouTube cookies from — bypasses "sign in to confirm" blocks
```

- [ ] **Step 5: Create directory structure**

```bash
mkdir -p src/commands src/events/client src/events/distube src/handlers src/utils tests/utils
```

- [ ] **Step 6: Install dependencies**

```bash
npm install
```

Expected: packages installed, no errors. If `@discordjs/opus` fails to build on Windows, install build tools: `npm install --global windows-build-tools` (run as admin), then retry.

- [ ] **Step 7: Commit**

```bash
git add package.json tsconfig.json jest.config.js .env.example
git commit -m "chore: project scaffolding and dependencies"
```

---

## Task 2: Types and Interfaces

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Create src/types.ts**

```typescript
import { Collection, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { DisTube } from 'distube';

export interface Command {
  data: SlashCommandBuilder | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;
  execute: (interaction: ChatInputCommandInteraction, distube: DisTube) => Promise<void>;
}

export interface ClientEvent {
  name: string;
  once?: boolean;
  execute: (...args: unknown[]) => Promise<void> | void;
}

export interface DistubeEvent {
  name: string;
  execute: (...args: unknown[]) => Promise<void> | void;
}

// Augment the discord.js Client so commands and distube are accessible anywhere
declare module 'discord.js' {
  interface Client {
    commands: Collection<string, Command>;
    distube: DisTube;
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add command, event, and client type definitions"
```

---

## Task 3: Formatters Utility (TDD)

**Files:**
- Create: `src/utils/formatters.ts`
- Create: `tests/utils/formatters.test.ts`

- [ ] **Step 1: Write the failing tests first**

Create `tests/utils/formatters.test.ts`:

```typescript
import { formatDuration, progressBar } from '../../src/utils/formatters';

describe('formatDuration', () => {
  it('formats seconds under a minute', () => {
    expect(formatDuration(45)).toBe('0:45');
  });

  it('formats exactly one minute', () => {
    expect(formatDuration(60)).toBe('1:00');
  });

  it('pads seconds with leading zero', () => {
    expect(formatDuration(65)).toBe('1:05');
  });

  it('formats hours correctly', () => {
    expect(formatDuration(3661)).toBe('1:01:01');
  });

  it('handles zero', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('formats long playlists', () => {
    expect(formatDuration(7384)).toBe('2:03:04');
  });
});

describe('progressBar', () => {
  it('returns a string of the correct total length', () => {
    const bar = progressBar(30, 120, 10);
    // Format: [progress chars]●[remaining chars] = length + 1 (for the ●)
    expect(bar.length).toBe(11);
  });

  it('shows full progress at the end', () => {
    const bar = progressBar(120, 120, 10);
    expect(bar.startsWith('━'.repeat(10))).toBe(true);
    expect(bar).toContain('●');
  });

  it('shows no progress at the start', () => {
    const bar = progressBar(0, 120, 10);
    expect(bar.startsWith('●')).toBe(true);
  });

  it('handles zero total duration gracefully', () => {
    const bar = progressBar(0, 0, 10);
    expect(bar.startsWith('●')).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/utils/formatters.test.ts
```

Expected: FAIL — "Cannot find module '../../src/utils/formatters'"

- [ ] **Step 3: Implement formatters.ts**

Create `src/utils/formatters.ts`:

```typescript
/**
 * Formats a duration in seconds to m:ss or h:mm:ss.
 * Example: 3661 → "1:01:01"
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mm = String(m).padStart(h > 0 ? 2 : 1, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Builds a text progress bar.
 * Example: progressBar(30, 120, 15) → "━━━●────────────"
 */
export function progressBar(current: number, total: number, length = 15): string {
  const filled = total > 0 ? Math.floor((current / total) * length) : 0;
  return '━'.repeat(filled) + '●' + '─'.repeat(length - filled);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/utils/formatters.test.ts
```

Expected: PASS — all 10 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/utils/formatters.ts tests/utils/formatters.test.ts
git commit -m "feat: add formatDuration and progressBar utilities (TDD)"
```

---

## Task 4: Disconnect Timer Utility (TDD)

**Files:**
- Create: `src/utils/disconnectTimer.ts`
- Create: `tests/utils/disconnectTimer.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/utils/disconnectTimer.test.ts`:

```typescript
import { setDisconnectTimer, clearDisconnectTimer, hasActiveTimer } from '../../src/utils/disconnectTimer';

beforeEach(() => {
  clearDisconnectTimer();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('disconnectTimer', () => {
  it('fires the callback after the given delay', () => {
    const cb = jest.fn();
    setDisconnectTimer(cb, 1000);
    jest.advanceTimersByTime(999);
    expect(cb).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('reports an active timer', () => {
    setDisconnectTimer(() => {}, 1000);
    expect(hasActiveTimer()).toBe(true);
  });

  it('reports no timer after clear', () => {
    setDisconnectTimer(() => {}, 1000);
    clearDisconnectTimer();
    expect(hasActiveTimer()).toBe(false);
  });

  it('cancels the callback when cleared before firing', () => {
    const cb = jest.fn();
    setDisconnectTimer(cb, 1000);
    clearDisconnectTimer();
    jest.advanceTimersByTime(2000);
    expect(cb).not.toHaveBeenCalled();
  });

  it('replaces an existing timer when set again', () => {
    const cb1 = jest.fn();
    const cb2 = jest.fn();
    setDisconnectTimer(cb1, 1000);
    setDisconnectTimer(cb2, 1000);
    jest.advanceTimersByTime(1000);
    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).toHaveBeenCalledTimes(1);
  });

  it('clears itself after firing', () => {
    setDisconnectTimer(() => {}, 1000);
    jest.advanceTimersByTime(1000);
    expect(hasActiveTimer()).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/utils/disconnectTimer.test.ts
```

Expected: FAIL — "Cannot find module"

- [ ] **Step 3: Implement disconnectTimer.ts**

Create `src/utils/disconnectTimer.ts`:

```typescript
let timer: ReturnType<typeof setTimeout> | null = null;

/** Starts the disconnect countdown. Cancels any existing timer first. */
export function setDisconnectTimer(callback: () => void, ms: number): void {
  clearDisconnectTimer();
  timer = setTimeout(() => {
    timer = null;
    callback();
  }, ms);
}

/** Cancels the pending disconnect timer if one is active. */
export function clearDisconnectTimer(): void {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
}

/** Returns true if a disconnect countdown is currently running. */
export function hasActiveTimer(): boolean {
  return timer !== null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/utils/disconnectTimer.test.ts
```

Expected: PASS — all 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/utils/disconnectTimer.ts tests/utils/disconnectTimer.test.ts
git commit -m "feat: add disconnect timer utility (TDD)"
```

---

## Task 5: Embeds Utility

**Files:**
- Create: `src/utils/embeds.ts`

All embed construction lives here. Commands and events call these functions — they never build embeds inline.

- [ ] **Step 1: Create src/utils/embeds.ts**

```typescript
import { EmbedBuilder } from 'discord.js';
import type { Song, Playlist, Queue } from 'distube';
import { formatDuration, progressBar } from './formatters.js';

const COLOR = 0xff0000; // YouTube red

function requesterName(song: Song): string {
  return song.member?.displayName ?? 'Unknown';
}

export const embeds = {
  /** Fired by playSong event when a single track starts playing */
  nowPlayingTrack(song: Song): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: '▶  Now Playing' })
      .setTitle(song.name ?? 'Unknown')
      .setURL(song.url ?? null)
      .setThumbnail(song.thumbnail ?? null)
      .addFields(
        { name: 'Duration', value: song.formattedDuration ?? '—', inline: true },
        { name: 'Requested by', value: requesterName(song), inline: true },
      );
  },

  /** Fired by playList event when a playlist starts playing */
  nowPlayingPlaylist(playlist: Playlist, song: Song): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: '▶  Now Playing Playlist' })
      .setTitle(playlist.name ?? 'Unknown Playlist')
      .setURL(playlist.url ?? null)
      .setThumbnail(playlist.thumbnail ?? null)
      .addFields(
        { name: 'First Track', value: song.name ?? 'Unknown', inline: true },
        { name: 'Total Tracks', value: String(playlist.songs.length), inline: true },
        { name: 'Requested by', value: requesterName(song), inline: true },
      );
  },

  /** Fired by addSong event when a track is queued behind an existing track */
  addedToQueue(song: Song, position: number): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: '➕  Added to Queue' })
      .setTitle(song.name ?? 'Unknown')
      .setURL(song.url ?? null)
      .addFields(
        { name: 'Duration', value: song.formattedDuration ?? '—', inline: true },
        { name: 'Position', value: `#${position}`, inline: true },
        { name: 'Requested by', value: requesterName(song), inline: true },
      );
  },

  /** Fired by addList event when a playlist is queued */
  playlistAdded(playlist: Playlist): EmbedBuilder {
    const requester = playlist.songs[0] ? requesterName(playlist.songs[0]) : 'Unknown';
    return new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: '➕  Playlist Added to Queue' })
      .setTitle(playlist.name ?? 'Unknown Playlist')
      .setURL(playlist.url ?? null)
      .addFields(
        { name: 'Tracks', value: String(playlist.songs.length), inline: true },
        { name: 'Requested by', value: requester, inline: true },
      );
  },

  /** Used by /queue command */
  queueList(queue: Queue): EmbedBuilder {
    const songs = queue.songs;
    const current = songs[0];
    const queued = songs.slice(1);

    const trackList = queued.length > 0
      ? queued
          .slice(0, 10)
          .map((s, i) => `**${i + 1}.** [${s.name ?? 'Unknown'}](${s.url}) \`${s.formattedDuration ?? '—'}\``)
          .join('\n')
      : 'No tracks queued.';

    const totalSeconds = queued.reduce((acc, s) => acc + (s.duration ?? 0), 0);
    const overflow = queued.length > 10 ? `\n*...and ${queued.length - 10} more*` : '';

    return new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: '🎵  Queue' })
      .addFields({ name: 'Now Playing', value: `[${current?.name ?? 'Unknown'}](${current?.url})` })
      .addFields({ name: 'Up Next', value: trackList + overflow })
      .addFields(
        { name: 'Total in Queue', value: String(queued.length), inline: true },
        { name: 'Total Duration', value: formatDuration(totalSeconds), inline: true },
      );
  },

  /** Used by /nowplaying command — includes progress bar */
  nowPlayingCommand(song: Song, currentTime: number): EmbedBuilder {
    const bar = progressBar(currentTime, song.duration ?? 0);
    const timeLabel = `${formatDuration(currentTime)} / ${song.formattedDuration ?? '—'}`;
    return new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: '▶  Now Playing' })
      .setTitle(song.name ?? 'Unknown')
      .setURL(song.url ?? null)
      .setThumbnail(song.thumbnail ?? null)
      .setDescription(`${bar}\n\`${timeLabel}\``)
      .addFields({ name: 'Requested by', value: requesterName(song), inline: true });
  },

  /** Fired by finish event */
  queueFinished(): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: '✅  Queue Finished' })
      .setDescription('Nothing left to play. Add more songs or I\'ll leave in **10 minutes**.');
  },

  /** Used by /stop command */
  stopped(): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: '⏹  Playback Stopped' })
      .setDescription('Queue is intact. Use `/resume` to continue or `/play` to add more.');
  },

  /** Used by /skip command */
  skipped(): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: '⏭  Skipped' })
      .setDescription('Playing the next track.');
  },

  /** Used by /pause command */
  paused(): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: '⏸  Paused' })
      .setDescription('Use `/resume` to continue.');
  },

  /** Used by /resume command */
  resumed(): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: '▶  Resumed' })
      .setDescription('Playback resumed.');
  },

  /** Used by /clear command */
  cleared(): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: '🗑  Queue Cleared' })
      .setDescription('The queue has been cleared. Current track will finish playing.');
  },

  /** Used by /next command */
  nextUp(song: Song): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: '⏭  Playing Next' })
      .setTitle(song.name ?? 'Unknown')
      .setURL(song.url ?? null);
  },

  /** Used for all error responses — always sent ephemeral */
  error(message: string): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: '❌  Error' })
      .setDescription(message);
  },
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/utils/embeds.ts
git commit -m "feat: add embeds utility with all embed factories"
```

---

## Task 6: Handlers

**Files:**
- Create: `src/handlers/commandHandler.ts`
- Create: `src/handlers/eventHandler.ts`

- [ ] **Step 1: Create src/handlers/commandHandler.ts**

```typescript
import { readdirSync } from 'fs';
import { join } from 'path';
import { Collection, REST, Routes, Client } from 'discord.js';
import type { Command } from '../types.js';

export async function loadCommands(client: Client): Promise<void> {
  client.commands = new Collection();
  const commandsPath = join(__dirname, '..', 'commands');

  for (const file of readdirSync(commandsPath).filter(f => f.endsWith('.js') || f.endsWith('.ts'))) {
    const command: Command = await import(join(commandsPath, file));
    client.commands.set(command.data.name, command);
  }

  console.log(`[Commands] Loaded ${client.commands.size} command(s).`);
}

export async function registerCommands(client: Client): Promise<void> {
  const rest = new REST().setToken(process.env.DISCORD_TOKEN!);
  const body = [...client.commands.values()].map(c => c.data.toJSON());
  const clientId = process.env.CLIENT_ID!;
  const guildId = process.env.GUILD_ID;

  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body });
    console.log(`[Commands] Registered ${body.length} guild command(s) to guild ${guildId}.`);
  } else {
    await rest.put(Routes.applicationCommands(clientId), { body });
    console.log(`[Commands] Registered ${body.length} global command(s). May take up to 1 hour to appear.`);
  }
}
```

- [ ] **Step 2: Create src/handlers/eventHandler.ts**

```typescript
import { readdirSync } from 'fs';
import { join } from 'path';
import type { Client } from 'discord.js';
import type { DisTube } from 'distube';

export async function loadEvents(client: Client, distube: DisTube): Promise<void> {
  // Client events
  const clientEventsPath = join(__dirname, '..', 'events', 'client');
  for (const file of readdirSync(clientEventsPath).filter(f => f.endsWith('.js') || f.endsWith('.ts'))) {
    const event = await import(join(clientEventsPath, file));
    if (event.once) {
      client.once(event.name, (...args: unknown[]) => event.execute(...args));
    } else {
      client.on(event.name, (...args: unknown[]) => event.execute(...args));
    }
  }

  // DisTube events
  const distubeEventsPath = join(__dirname, '..', 'events', 'distube');
  for (const file of readdirSync(distubeEventsPath).filter(f => f.endsWith('.js') || f.endsWith('.ts'))) {
    const event = await import(join(distubeEventsPath, file));
    distube.on(event.name, (...args: unknown[]) => event.execute(...args));
  }

  console.log('[Events] Client and DisTube events loaded.');
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/handlers/commandHandler.ts src/handlers/eventHandler.ts
git commit -m "feat: add auto-loading command and event handlers"
```

---

## Task 7: Bootstrap Entry Point

**Files:**
- Create: `src/index.ts`

- [ ] **Step 1: Create src/index.ts**

```typescript
import 'dotenv/config';
import { join } from 'path';
import { Client, GatewayIntentBits } from 'discord.js';
import { DisTube } from 'distube';
import { YtDlpPlugin } from '@distube/yt-dlp';
import { SpotifyPlugin } from '@distube/spotify';
import { loadCommands, registerCommands } from './handlers/commandHandler.js';
import { loadEvents } from './handlers/eventHandler.js';

// Wire ffmpeg-static so DisTube/voice can find FFmpeg without a system install
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpegPath: string = require('ffmpeg-static');
process.env['FFMPEG_PATH'] = ffmpegPath;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

const ytdlpPluginOptions: Record<string, unknown> = { update: false };
if (process.env['COOKIES_FROM_BROWSER']) {
  ytdlpPluginOptions['ytdlpArgs'] = ['--cookies-from-browser', process.env['COOKIES_FROM_BROWSER']];
}

const distube = new DisTube(client, {
  leaveOnEmpty: true,
  leaveOnFinish: false,
  leaveOnStop: false,
  plugins: [
    new YtDlpPlugin(ytdlpPluginOptions),
    new SpotifyPlugin(),
  ],
});

client.distube = distube;

(async () => {
  try {
    await loadCommands(client);
    await registerCommands(client);
    await loadEvents(client, distube);
    await client.login(process.env['DISCORD_TOKEN']);
  } catch (error) {
    console.error('[Fatal] Failed to start bot:', error);
    process.exit(1);
  }
})();
```

> **Note on YtDlpPlugin:** If the `ytdlpArgs` option isn't supported by your installed version of `@distube/yt-dlp`, check the package README for the correct option name to pass `--cookies-from-browser`.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: add bootstrapper with DisTube and client setup"
```

---

## Task 8: Client Events

**Files:**
- Create: `src/events/client/ready.ts`
- Create: `src/events/client/interactionCreate.ts`

- [ ] **Step 1: Create src/events/client/ready.ts**

```typescript
import type { Client } from 'discord.js';

export const name = 'ready';
export const once = true;

export function execute(client: Client): void {
  console.log(`[Bot] Logged in as ${client.user?.tag ?? 'unknown'}`);
}
```

- [ ] **Step 2: Create src/events/client/interactionCreate.ts**

```typescript
import { Interaction } from 'discord.js';
import { embeds } from '../../utils/embeds.js';

export const name = 'interactionCreate';
export const once = false;

export async function execute(interaction: Interaction): Promise<void> {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) {
    await interaction.reply({ embeds: [embeds.error(`Unknown command: ${interaction.commandName}`)], ephemeral: true });
    return;
  }

  try {
    await command.execute(interaction, interaction.client.distube);
  } catch (error) {
    console.error(`[Command:${interaction.commandName}]`, error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ embeds: [embeds.error(message)] });
    } else {
      await interaction.reply({ embeds: [embeds.error(message)], ephemeral: true });
    }
  }
}
```

- [ ] **Step 3: Compile check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/events/client/ready.ts src/events/client/interactionCreate.ts
git commit -m "feat: add ready and interactionCreate client events"
```

---

## Task 9: DisTube Playback Events

**Files:**
- Create: `src/events/distube/playSong.ts`
- Create: `src/events/distube/addSong.ts`
- Create: `src/events/distube/playList.ts`
- Create: `src/events/distube/addList.ts`

- [ ] **Step 1: Create src/events/distube/playSong.ts**

```typescript
import type { Queue, Song } from 'distube';
import { embeds } from '../../utils/embeds.js';

export const name = 'playSong';

export async function execute(queue: Queue, song: Song): Promise<void> {
  await queue.textChannel?.send({ embeds: [embeds.nowPlayingTrack(song)] });
}
```

- [ ] **Step 2: Create src/events/distube/addSong.ts**

```typescript
import type { Queue, Song } from 'distube';
import { embeds } from '../../utils/embeds.js';
import { clearDisconnectTimer } from '../../utils/disconnectTimer.js';

export const name = 'addSong';

export async function execute(queue: Queue, song: Song): Promise<void> {
  clearDisconnectTimer();
  // queue.songs[0] is currently playing; the added song is at the end
  const position = queue.songs.length - 1;
  await queue.textChannel?.send({ embeds: [embeds.addedToQueue(song, position)] });
}
```

- [ ] **Step 3: Create src/events/distube/playList.ts**

```typescript
import type { Queue, Playlist, Song } from 'distube';
import { embeds } from '../../utils/embeds.js';

export const name = 'playList';

export async function execute(queue: Queue, playlist: Playlist, song: Song): Promise<void> {
  await queue.textChannel?.send({ embeds: [embeds.nowPlayingPlaylist(playlist, song)] });
}
```

- [ ] **Step 4: Create src/events/distube/addList.ts**

```typescript
import type { Queue, Playlist } from 'distube';
import { embeds } from '../../utils/embeds.js';
import { clearDisconnectTimer } from '../../utils/disconnectTimer.js';

export const name = 'addList';

export async function execute(queue: Queue, playlist: Playlist): Promise<void> {
  clearDisconnectTimer();
  await queue.textChannel?.send({ embeds: [embeds.playlistAdded(playlist)] });
}
```

- [ ] **Step 5: Compile check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/events/distube/playSong.ts src/events/distube/addSong.ts src/events/distube/playList.ts src/events/distube/addList.ts
git commit -m "feat: add DisTube playback events (playSong, addSong, playList, addList)"
```

---

## Task 10: DisTube Lifecycle Events

**Files:**
- Create: `src/events/distube/finish.ts`
- Create: `src/events/distube/disconnect.ts`
- Create: `src/events/distube/error.ts`

- [ ] **Step 1: Create src/events/distube/finish.ts**

```typescript
import type { Queue } from 'distube';
import { embeds } from '../../utils/embeds.js';
import { setDisconnectTimer } from '../../utils/disconnectTimer.js';

export const name = 'finish';

const TEN_MINUTES = 10 * 60 * 1000;

export async function execute(queue: Queue): Promise<void> {
  await queue.textChannel?.send({ embeds: [embeds.queueFinished()] });

  setDisconnectTimer(() => {
    try {
      queue.distube.voices.get(queue.id)?.leave();
    } catch {
      // Voice connection already cleaned up — ignore
    }
  }, TEN_MINUTES);
}
```

- [ ] **Step 2: Create src/events/distube/disconnect.ts**

```typescript
import type { Queue } from 'distube';

export const name = 'disconnect';

export function execute(_queue: Queue): void {
  // DisTube handles cleanup internally — nothing to do here
}
```

- [ ] **Step 3: Create src/events/distube/error.ts**

```typescript
import type { TextChannel } from 'discord.js';
import { embeds } from '../../utils/embeds.js';

export const name = 'error';

export async function execute(channel: TextChannel | null, error: Error): Promise<void> {
  console.error('[DisTube Error]', error.message);

  const isYouTubeBlock = error.message.toLowerCase().includes('sign in to confirm');
  const userMessage = isYouTubeBlock
    ? 'YouTube is blocking this request. Try again in a moment.'
    : `An error occurred: ${error.message}`;

  await channel?.send({ embeds: [embeds.error(userMessage)] });
}
```

- [ ] **Step 4: Compile check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/events/distube/finish.ts src/events/distube/disconnect.ts src/events/distube/error.ts
git commit -m "feat: add DisTube lifecycle events (finish, disconnect, error)"
```

---

## Task 11: Play Commands

**Files:**
- Create: `src/commands/play.ts`
- Create: `src/commands/playnext.ts`

These commands validate the user's voice channel, call DisTube, and let events handle the response embeds.

- [ ] **Step 1: Create src/commands/play.ts**

```typescript
import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember, TextChannel } from 'discord.js';
import type { DisTube } from 'distube';
import { embeds } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('play')
  .setDescription('Play a song or playlist — adds to the back of the queue')
  .addStringOption(opt =>
    opt.setName('query')
      .setDescription('YouTube URL, Spotify URL, SoundCloud URL, or search term')
      .setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction, distube: DisTube): Promise<void> {
  const member = interaction.member as GuildMember;
  const voiceChannel = member.voice.channel;

  if (!voiceChannel) {
    await interaction.reply({ embeds: [embeds.error('You need to be in a voice channel first.')], ephemeral: true });
    return;
  }

  const query = interaction.options.getString('query', true);
  await interaction.deferReply({ ephemeral: true });

  try {
    await distube.play(voiceChannel, query, {
      member,
      textChannel: interaction.channel as TextChannel,
    });
    await interaction.deleteReply();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Something went wrong.';
    const isYouTubeBlock = message.toLowerCase().includes('sign in to confirm');
    await interaction.editReply({
      embeds: [embeds.error(isYouTubeBlock ? 'YouTube is blocking this request. Try again in a moment.' : message)],
    });
  }
}
```

- [ ] **Step 2: Create src/commands/playnext.ts**

```typescript
import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember, TextChannel } from 'discord.js';
import type { DisTube } from 'distube';
import { embeds } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('playnext')
  .setDescription('Play a song next — inserts at the front of the queue')
  .addStringOption(opt =>
    opt.setName('query')
      .setDescription('YouTube URL, Spotify URL, SoundCloud URL, or search term')
      .setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction, distube: DisTube): Promise<void> {
  const member = interaction.member as GuildMember;
  const voiceChannel = member.voice.channel;

  if (!voiceChannel) {
    await interaction.reply({ embeds: [embeds.error('You need to be in a voice channel first.')], ephemeral: true });
    return;
  }

  const query = interaction.options.getString('query', true);
  await interaction.deferReply({ ephemeral: true });

  try {
    await distube.play(voiceChannel, query, {
      member,
      textChannel: interaction.channel as TextChannel,
      position: 1,
    });
    await interaction.deleteReply();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Something went wrong.';
    const isYouTubeBlock = message.toLowerCase().includes('sign in to confirm');
    await interaction.editReply({
      embeds: [embeds.error(isYouTubeBlock ? 'YouTube is blocking this request. Try again in a moment.' : message)],
    });
  }
}
```

- [ ] **Step 3: Compile check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/commands/play.ts src/commands/playnext.ts
git commit -m "feat: add /play and /playnext commands"
```

---

## Task 12: Playback Control Commands

**Files:**
- Create: `src/commands/skip.ts`
- Create: `src/commands/stop.ts`
- Create: `src/commands/pause.ts`
- Create: `src/commands/resume.ts`

- [ ] **Step 1: Create src/commands/skip.ts**

```typescript
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { DisTube } from 'distube';
import { embeds } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('skip')
  .setDescription('Skip the current track');

export async function execute(interaction: ChatInputCommandInteraction, distube: DisTube): Promise<void> {
  const queue = distube.getQueue(interaction.guildId!);
  if (!queue) {
    await interaction.reply({ embeds: [embeds.error('Nothing is currently playing.')], ephemeral: true });
    return;
  }

  try {
    await distube.skip(interaction.guildId!);
    await interaction.reply({ embeds: [embeds.skipped()] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not skip.';
    await interaction.reply({ embeds: [embeds.error(message)], ephemeral: true });
  }
}
```

- [ ] **Step 2: Create src/commands/stop.ts**

Note: DisTube v4 has no "stop without clearing queue" native method. We pause internally and label it as stopped — the queue is preserved and `/resume` works normally.

```typescript
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { DisTube } from 'distube';
import { embeds } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('stop')
  .setDescription('Stop playback — queue is kept intact');

export async function execute(interaction: ChatInputCommandInteraction, distube: DisTube): Promise<void> {
  const queue = distube.getQueue(interaction.guildId!);
  if (!queue) {
    await interaction.reply({ embeds: [embeds.error('Nothing is currently playing.')], ephemeral: true });
    return;
  }

  try {
    await distube.pause(interaction.guildId!);
    await interaction.reply({ embeds: [embeds.stopped()] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not stop.';
    await interaction.reply({ embeds: [embeds.error(message)], ephemeral: true });
  }
}
```

- [ ] **Step 3: Create src/commands/pause.ts**

```typescript
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { DisTube } from 'distube';
import { embeds } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('pause')
  .setDescription('Pause playback');

export async function execute(interaction: ChatInputCommandInteraction, distube: DisTube): Promise<void> {
  const queue = distube.getQueue(interaction.guildId!);
  if (!queue) {
    await interaction.reply({ embeds: [embeds.error('Nothing is currently playing.')], ephemeral: true });
    return;
  }
  if (queue.paused) {
    await interaction.reply({ embeds: [embeds.error('Playback is already paused. Use `/resume` to continue.')], ephemeral: true });
    return;
  }

  try {
    await distube.pause(interaction.guildId!);
    await interaction.reply({ embeds: [embeds.paused()] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not pause.';
    await interaction.reply({ embeds: [embeds.error(message)], ephemeral: true });
  }
}
```

- [ ] **Step 4: Create src/commands/resume.ts**

```typescript
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { DisTube } from 'distube';
import { embeds } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('resume')
  .setDescription('Resume playback');

export async function execute(interaction: ChatInputCommandInteraction, distube: DisTube): Promise<void> {
  const queue = distube.getQueue(interaction.guildId!);
  if (!queue) {
    await interaction.reply({ embeds: [embeds.error('Nothing is currently playing.')], ephemeral: true });
    return;
  }
  if (!queue.paused) {
    await interaction.reply({ embeds: [embeds.error('Playback is not paused.')], ephemeral: true });
    return;
  }

  try {
    await distube.resume(interaction.guildId!);
    await interaction.reply({ embeds: [embeds.resumed()] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not resume.';
    await interaction.reply({ embeds: [embeds.error(message)], ephemeral: true });
  }
}
```

- [ ] **Step 5: Compile check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/commands/skip.ts src/commands/stop.ts src/commands/pause.ts src/commands/resume.ts
git commit -m "feat: add /skip, /stop, /pause, /resume commands"
```

---

## Task 13: Queue Management Commands

**Files:**
- Create: `src/commands/clear.ts`
- Create: `src/commands/next.ts`

- [ ] **Step 1: Create src/commands/clear.ts**

```typescript
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { DisTube } from 'distube';
import { embeds } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('clear')
  .setDescription('Clear the queue — current track keeps playing');

export async function execute(interaction: ChatInputCommandInteraction, distube: DisTube): Promise<void> {
  const queue = distube.getQueue(interaction.guildId!);
  if (!queue || queue.songs.length <= 1) {
    await interaction.reply({ embeds: [embeds.error('There are no queued tracks to clear.')], ephemeral: true });
    return;
  }

  // songs[0] is currently playing — remove everything after it
  queue.songs.splice(1);
  await interaction.reply({ embeds: [embeds.cleared()] });
}
```

- [ ] **Step 2: Create src/commands/next.ts**

```typescript
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { DisTube } from 'distube';
import { embeds } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('next')
  .setDescription('Move a queued track to play next')
  .addIntegerOption(opt =>
    opt.setName('position')
      .setDescription('Queue position of the track to move (shown in /queue)')
      .setRequired(true)
      .setMinValue(2),
  );

export async function execute(interaction: ChatInputCommandInteraction, distube: DisTube): Promise<void> {
  const queue = distube.getQueue(interaction.guildId!);
  if (!queue || queue.songs.length < 2) {
    await interaction.reply({ embeds: [embeds.error('Not enough tracks in the queue.')], ephemeral: true });
    return;
  }

  const position = interaction.options.getInteger('position', true);
  // queue.songs[0] = currently playing
  // queue display position 1 = queue.songs[1], position N = queue.songs[N]
  const maxPosition = queue.songs.length - 1;

  if (position > maxPosition) {
    await interaction.reply({
      embeds: [embeds.error(`Position must be between 2 and ${maxPosition}.`)],
      ephemeral: true,
    });
    return;
  }

  const [song] = queue.songs.splice(position, 1);
  queue.songs.splice(1, 0, song);

  await interaction.reply({ embeds: [embeds.nextUp(song)] });
}
```

- [ ] **Step 3: Compile check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/commands/clear.ts src/commands/next.ts
git commit -m "feat: add /clear and /next commands"
```

---

## Task 14: Info Commands

**Files:**
- Create: `src/commands/queue.ts`
- Create: `src/commands/nowplaying.ts`

- [ ] **Step 1: Create src/commands/queue.ts**

```typescript
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { DisTube } from 'distube';
import { embeds } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('queue')
  .setDescription('Show the current queue');

export async function execute(interaction: ChatInputCommandInteraction, distube: DisTube): Promise<void> {
  const queue = distube.getQueue(interaction.guildId!);
  if (!queue || queue.songs.length === 0) {
    await interaction.reply({ embeds: [embeds.error('Nothing is currently playing.')], ephemeral: true });
    return;
  }

  await interaction.reply({ embeds: [embeds.queueList(queue)] });
}
```

- [ ] **Step 2: Create src/commands/nowplaying.ts**

```typescript
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { DisTube } from 'distube';
import { embeds } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('nowplaying')
  .setDescription('Show the currently playing track with progress');

export async function execute(interaction: ChatInputCommandInteraction, distube: DisTube): Promise<void> {
  const queue = distube.getQueue(interaction.guildId!);
  if (!queue || !queue.songs[0]) {
    await interaction.reply({ embeds: [embeds.error('Nothing is currently playing.')], ephemeral: true });
    return;
  }

  const song = queue.songs[0];
  const currentTime = queue.currentTime;

  await interaction.reply({ embeds: [embeds.nowPlayingCommand(song, currentTime)] });
}
```

- [ ] **Step 3: Final compile check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run all tests**

```bash
npm test
```

Expected: all tests pass (formatters + disconnectTimer).

- [ ] **Step 5: Commit**

```bash
git add src/commands/queue.ts src/commands/nowplaying.ts
git commit -m "feat: add /queue and /nowplaying commands"
```

---

## Task 15: First Run & Smoke Test

**Pre-flight checklist before first run:**

- [ ] **Step 1: Copy .env.example to .env and fill in values**

```bash
cp .env.example .env
```

Open `.env` and fill in:
- `DISCORD_TOKEN` — from Discord Developer Portal > Your App > Bot > Token
- `CLIENT_ID` — from Discord Developer Portal > Your App > General Information > Application ID
- `GUILD_ID` — right-click your server icon in Discord > Copy Server ID (requires Developer Mode on)
- `COOKIES_FROM_BROWSER=chrome` — leave as-is

- [ ] **Step 2: Ensure yt-dlp is installed**

DisTube's yt-dlp plugin needs the `yt-dlp` binary on PATH.

```bash
# Windows (via winget)
winget install yt-dlp

# Or via pip
pip install yt-dlp
```

Verify: `yt-dlp --version`

- [ ] **Step 3: Start the bot**

```bash
npm run dev
```

Expected output:
```
[Commands] Loaded 10 command(s).
[Commands] Registered 10 guild command(s) to guild <your-guild-id>.
[Events] Client and DisTube events loaded.
[Bot] Logged in as YourBot#1234
```

- [ ] **Step 4: Test /play**

In Discord: join a voice channel, then in a text channel run `/play never gonna give you up`.

Expected:
- Bot joins your voice channel
- "Now Playing" embed appears in the text channel with title, duration, and requester

- [ ] **Step 5: Test /queue and /nowplaying**

Queue 2-3 more songs with `/play`. Then:
- `/queue` — verify numbered list shows correctly
- `/nowplaying` — verify progress bar updates with elapsed time

- [ ] **Step 6: Test /next**

With 3+ songs in queue, run `/next 3`.

Expected: "Playing Next" embed confirms the track moved; `/queue` shows it at position 1.

- [ ] **Step 7: Test /playnext**

Run `/playnext [any song]`.

Expected: song appears at position 1 in the queue immediately.

- [ ] **Step 8: Test /pause, /resume, /stop**

- `/pause` → playback stops, embed confirms
- `/resume` → playback continues
- `/stop` → playback stops, embed says "Queue intact"
- `/resume` after stop → playback resumes (confirms queue was kept)

- [ ] **Step 9: Test /skip**

Run `/skip`. Expected: next track starts, "Now Playing" embed fires.

- [ ] **Step 10: Test /clear**

With tracks in queue, run `/clear`. Expected: "Queue Cleared" embed. `/queue` shows only the current track.

- [ ] **Step 11: Test queue-finish buffer**

Let the queue run out naturally. Expected:
- "Queue Finished" embed appears
- Bot stays in voice channel for 10 minutes
- After 10 minutes, bot leaves automatically
- Adding a song within 10 minutes cancels the timer and bot stays

- [ ] **Step 12: Test Spotify link**

Run `/play https://open.spotify.com/track/<any-track-id>`.

Expected: resolves to YouTube search and plays. (Bot does not attempt to stream from Spotify directly.)

- [ ] **Step 13: Commit smoke test completion**

```bash
git commit --allow-empty -m "chore: smoke test passed — bot is functional"
```

---

## Implementation Notes

**If `@discordjs/opus` fails to build on Windows:**
Install Visual Studio Build Tools (free): search "Visual Studio Build Tools" and install the "Desktop development with C++" workload. Then `npm install` again.

**If commands don't appear in Discord:**
Make sure `GUILD_ID` is set for instant registration. Without it, global registration takes up to 1 hour.

**If YouTube returns "sign in to confirm":**
Ensure `COOKIES_FROM_BROWSER=chrome` is set in `.env` and you're logged into YouTube in Chrome. If the YtDlpPlugin doesn't support the `ytdlpArgs` option, create a `yt-dlp.conf` file at `%APPDATA%\yt-dlp\config` with `--cookies-from-browser chrome`.

**DisTube v4 API verification:**
The `position` option in `distube.play()` inserts the track at the front of the queue — verify this is supported in your installed version of DisTube v4 by checking `node_modules/distube/README.md` or the [DisTube docs](https://distube.js.org/).
