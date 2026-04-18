import type { Queue, Song } from 'distube';
import { embeds } from '../../utils/embeds';
import { startTracker, getTrackerMessage } from '../../utils/nowPlayingTracker';
import { createPlayerButtons } from '../../utils/playerButtons';

export const name = 'playSong';

export async function execute(queue: Queue, song: Song): Promise<void> {
  // When looping a single song, reuse the existing now-playing message instead of
  // sending a new one each loop — avoids flooding the channel with duplicate embeds.
  const existingMessage = queue.repeatMode === 1 ? getTrackerMessage(queue.id) : undefined;
  if (existingMessage) {
    await existingMessage.edit({
      embeds: [embeds.nowPlayingCommand(song, 0, queue.repeatMode)],
      components: [createPlayerButtons(queue)],
    }).catch(() => {});
    startTracker(queue.id, existingMessage, queue, song);
  } else {
    const message = await queue.textChannel?.send({
      embeds: [embeds.nowPlayingCommand(song, queue.currentTime, queue.repeatMode)],
      components: [createPlayerButtons(queue)],
    });
    if (message) startTracker(queue.id, message, queue, song);
  }

  // Pre-fetch the next song's stream URL in the background while this one plays.
  // DisTube checks song.stream.url before calling getStreamURL — if already set, it skips
  // the yt-dlp call entirely, eliminating the gap between tracks.
  const next = queue.songs[1];
  if (next && !next.isLive && next.stream.playFromSource && !next.stream.url) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plugin = next.plugin as any;
    plugin?.getStreamURL?.(next)
      .then((url: string) => {
        // Only cache if this song is still next — queue may have been reordered.
        // Cast needed: TS loses the playFromSource union narrowing across async callbacks.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (queue.songs[1] === next) (next.stream as any).url = url;
      })
      .catch(() => {}); // Silent fail — DisTube will fetch on demand if this errors
  }
}
