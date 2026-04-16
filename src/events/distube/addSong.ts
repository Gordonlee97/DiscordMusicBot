import type { Queue, Song } from 'distube';
import { embeds } from '../../utils/embeds';
import { clearDisconnectTimer } from '../../utils/disconnectTimer';

export const name = 'addSong';

export async function execute(queue: Queue, song: Song): Promise<void> {
  clearDisconnectTimer();
  // queue.songs[0] is currently playing; the added song is at the end
  const position = queue.songs.length - 1;
  await queue.textChannel?.send({ embeds: [embeds.addedToQueue(song, position)] });
}
