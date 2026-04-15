import type { TextChannel } from 'discord.js';
import { embeds } from '../../utils/embeds';

export const name = 'error';

export async function execute(channel: TextChannel | null, error: Error): Promise<void> {
  console.error('[DisTube Error]', error.message);

  const isYouTubeBlock = error.message.toLowerCase().includes('sign in to confirm');
  const userMessage = isYouTubeBlock
    ? 'YouTube is blocking this request. Try again in a moment.'
    : `An error occurred: ${error.message}`;

  await channel?.send({ embeds: [embeds.error(userMessage)] });
}
