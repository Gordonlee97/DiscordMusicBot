import type { Queue } from 'distube';
import { clearTracker } from '../../utils/nowPlayingTracker';

export const name = 'disconnect';

export function execute(queue: Queue): void {
  clearTracker(queue.id);
}
