import type { Queue } from 'distube';

export const name = 'empty';

// Fired when the voice channel becomes empty (replaces leaveOnEmpty option from v4).
export function execute(queue: Queue): void {
  try {
    queue.voice.leave();
  } catch {
    // Voice connection already cleaned up — ignore
  }
}
