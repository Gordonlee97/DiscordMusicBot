import type { Queue } from 'distube';
import { embeds } from '../../utils/embeds';
import { setDisconnectTimer } from '../../utils/disconnectTimer';

export const name = 'finish';

const TEN_MINUTES = 10 * 60 * 1000;

export async function execute(queue: Queue): Promise<void> {
  await queue.textChannel?.send({ embeds: [embeds.queueFinished()] });

  setDisconnectTimer(() => {
    try {
      queue.voice.leave();
    } catch {
      // Voice connection already cleaned up — ignore
    }
  }, TEN_MINUTES);
}
