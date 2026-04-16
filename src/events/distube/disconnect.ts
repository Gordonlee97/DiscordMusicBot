import type { Queue } from 'distube';

export const name = 'disconnect';

export function execute(_queue: Queue): void {
  // DisTube handles cleanup internally — nothing to do here
}
