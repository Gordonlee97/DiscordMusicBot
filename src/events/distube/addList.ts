import type { Queue, Playlist } from 'distube';
import { embeds } from '../../utils/embeds';
import { clearDisconnectTimer } from '../../utils/disconnectTimer';

export const name = 'addList';

export async function execute(queue: Queue, playlist: Playlist): Promise<void> {
  clearDisconnectTimer();
  await queue.textChannel?.send({ embeds: [embeds.playlistAdded(playlist)] });
}
