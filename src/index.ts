import 'dotenv/config';
import { execSync } from 'child_process';
import { dirname, basename } from 'path';
import { Client, GatewayIntentBits } from 'discord.js';
import { DisTube } from 'distube';
import { YtDlpPlugin } from '@distube/yt-dlp';
import { SpotifyPlugin } from '@distube/spotify';
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

// Point @distube/yt-dlp at the system yt-dlp (installed via winget).
// The plugin uses YTDLP_DIR + YTDLP_FILENAME to build its binary path.
// update: false prevents the plugin from downloading/overwriting the system binary.
// Note: v1.x only accepts { update } — ytdlpArgs is not supported.
// To bypass YouTube "sign in to confirm" blocks, place a yt-dlp.conf file in the
// yt-dlp config directory (see: https://github.com/yt-dlp/yt-dlp#configuration).
const ytdlpSystemPath = execSync('where yt-dlp', { encoding: 'utf8' }).trim().split('\n')[0].trim();
process.env['YTDLP_DIR'] = dirname(ytdlpSystemPath);
process.env['YTDLP_FILENAME'] = basename(ytdlpSystemPath);

const distube = new DisTube(client, {
  leaveOnEmpty: true,
  leaveOnFinish: false,
  leaveOnStop: false,
  plugins: [new YtDlpPlugin({ update: false }), new SpotifyPlugin()],
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
