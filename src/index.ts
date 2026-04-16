import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import { DisTube } from 'distube';
import { YtDlpPlugin } from '@distube/yt-dlp';
import { SpotifyPlugin } from '@distube/spotify';
import { YtDlpSearchPlugin } from './plugins/YtDlpSearchPlugin';
import { loadCommands, registerCommands } from './handlers/commandHandler';
import { loadEvents } from './handlers/eventHandler';

// Wire ffmpeg-static so DisTube/voice can find FFmpeg without a system install
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegPath = require('ffmpeg-static') as string;
process.env['FFMPEG_PATH'] = ffmpegPath;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// update: true — plugin downloads/caches its own yt-dlp binary on first run
// and keeps it updated on subsequent startups.
const distube = new DisTube(client, {
  // emitAddListWhenCreatingQueue: false — suppress addList on first play;
  // the playSong event already announces the now-playing track.
  emitAddListWhenCreatingQueue: false,
  // Plugin order matters for URL resolution (first validate() wins).
  // SpotifyPlugin handles Spotify URLs → creates search queries → YtDlpSearchPlugin plays them.
  // YtDlpSearchPlugin handles text search via ytsearch1:.
  // YtDlpPlugin must be last (it warns if it isn't); handles all remaining URLs.
  plugins: [new SpotifyPlugin(), new YtDlpSearchPlugin(), new YtDlpPlugin({ update: true })],
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
