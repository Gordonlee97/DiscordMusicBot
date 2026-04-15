import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { DisTube } from 'distube';
import { embeds } from '../utils/embeds';

export const data = new SlashCommandBuilder()
  .setName('pause')
  .setDescription('Pause playback');

export async function execute(interaction: ChatInputCommandInteraction, distube: DisTube): Promise<void> {
  const queue = distube.getQueue(interaction.guildId!);
  if (!queue) {
    await interaction.reply({ embeds: [embeds.error('Nothing is currently playing.')], ephemeral: true });
    return;
  }
  if (queue.paused) {
    await interaction.reply({ embeds: [embeds.error('Playback is already paused. Use `/resume` to continue.')], ephemeral: true });
    return;
  }

  try {
    await distube.pause(interaction.guildId!);
    await interaction.reply({ embeds: [embeds.paused()] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not pause.';
    await interaction.reply({ embeds: [embeds.error(message)], ephemeral: true });
  }
}
