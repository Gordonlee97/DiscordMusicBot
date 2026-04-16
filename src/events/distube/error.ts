import type { Queue, Song } from 'distube';
import { embeds } from '../../utils/embeds';
import { stopTracker } from '../../utils/nowPlayingTracker';

export const name = 'error';

// DisTube v5 error event: (error, queue, song?)
export async function execute(error: Error, queue: Queue, _song?: Song): Promise<void> {
  stopTracker(queue.id);
  console.error('[DisTube Error]', error.message);

  const isYouTubeBlock = error.message.toLowerCase().includes('sign in to confirm');
  const userMessage = isYouTubeBlock
    ? 'YouTube is blocking this request. Try again in a moment.'
    : `An error occurred: ${error.message}`;

  await queue.textChannel?.send({ embeds: [embeds.error(userMessage)] });
}
