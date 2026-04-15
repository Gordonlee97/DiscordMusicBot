import type { Queue, Playlist, Song } from 'distube';
import { embeds } from '../../utils/embeds';

export const name = 'playList';

export async function execute(queue: Queue, playlist: Playlist, song: Song): Promise<void> {
  await queue.textChannel?.send({ embeds: [embeds.nowPlayingPlaylist(playlist, song)] });
}
