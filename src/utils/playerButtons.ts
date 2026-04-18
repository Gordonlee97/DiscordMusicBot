import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import type { Queue } from 'distube';

/**
 * Builds the playback control button row for the now-playing embed.
 * Pause/Resume toggles based on queue state; Skip is disabled when nothing is queued next.
 */
export function createPlayerButtons(queue: Queue, pausedOverride?: boolean): ActionRowBuilder<ButtonBuilder> {
  const paused = pausedOverride ?? queue.paused;
  const hasNext = queue.songs.length > 1;

  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('player:pause')
      .setLabel(paused ? 'Resume' : 'Pause')
      .setEmoji(paused ? '▶️' : '⏸️')
      .setStyle(paused ? ButtonStyle.Success : ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('player:skip')
      .setLabel('Skip')
      .setEmoji('⏭️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!hasNext),
    new ButtonBuilder()
      .setCustomId('player:stop')
      .setLabel('Stop')
      .setEmoji('⏹️')
      .setStyle(ButtonStyle.Danger),
  );
}
