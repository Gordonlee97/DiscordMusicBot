import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { DisTube } from 'distube';
import { embeds } from '../utils/embeds';

export const data = new SlashCommandBuilder()
  .setName('resume')
  .setDescription('Resume playback');

export async function execute(interaction: ChatInputCommandInteraction, distube: DisTube): Promise<void> {
  const queue = distube.getQueue(interaction.guildId!);
  if (!queue) {
    await interaction.reply({ embeds: [embeds.error('Nothing is currently playing.')], ephemeral: true });
    return;
  }
  if (!queue.paused) {
    await interaction.reply({ embeds: [embeds.error('Playback is not paused.')], ephemeral: true });
    return;
  }

  try {
    await distube.resume(interaction.guildId!);
    await interaction.reply({ embeds: [embeds.resumed()] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not resume.';
    await interaction.reply({ embeds: [embeds.error(message)], ephemeral: true });
  }
}
