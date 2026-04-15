import 'dotenv/config';
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

const ytdlpPluginOptions: Record<string, unknown> = { update: false };
if (process.env['COOKIES_FROM_BROWSER']) {
  ytdlpPluginOptions['ytdlpArgs'] = ['--cookies-from-browser', process.env['COOKIES_FROM_BROWSER']];
}

const distube = new DisTube(client, {
  leaveOnEmpty: true,
  leaveOnFinish: false,
  leaveOnStop: false,
  plugins: [new YtDlpPlugin(ytdlpPluginOptions), new SpotifyPlugin()],
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
