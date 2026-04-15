import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { DisTube } from 'distube';
import { embeds } from '../utils/embeds';

export const data = new SlashCommandBuilder()
  .setName('skip')
  .setDescription('Skip the current track');

export async function execute(interaction: ChatInputCommandInteraction, distube: DisTube): Promise<void> {
  const queue = distube.getQueue(interaction.guildId!);
  if (!queue) {
    await interaction.reply({ embeds: [embeds.error('Nothing is currently playing.')], ephemeral: true });
    return;
  }

  try {
    await distube.skip(interaction.guildId!);
    await interaction.reply({ embeds: [embeds.skipped()] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not skip.';
    await interaction.reply({ embeds: [embeds.error(message)], ephemeral: true });
  }
}
