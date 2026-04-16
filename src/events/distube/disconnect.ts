import type { Queue } from 'distube';
import { stopTracker } from '../../utils/nowPlayingTracker';

export const name = 'disconnect';

export function execute(queue: Queue): void {
  stopTracker(queue.id);
}
