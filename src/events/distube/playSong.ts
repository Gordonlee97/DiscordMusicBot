import type { Queue, Song } from 'distube';
import { embeds } from '../../utils/embeds';

export const name = 'playSong';

export async function execute(queue: Queue, song: Song): Promise<void> {
  await queue.textChannel?.send({ embeds: [embeds.nowPlayingTrack(song)] });
}
