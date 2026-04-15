import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { DisTube } from 'distube';
import { embeds } from '../utils/embeds';

export const data = new SlashCommandBuilder()
  .setName('stop')
  .setDescription('Stop playback — queue is kept intact');

export async function execute(interaction: ChatInputCommandInteraction, distube: DisTube): Promise<void> {
  const queue = distube.getQueue(interaction.guildId!);
  if (!queue) {
    await interaction.reply({ embeds: [embeds.error('Nothing is currently playing.')], ephemeral: true });
    return;
  }

  try {
    await distube.pause(interaction.guildId!);
    await interaction.reply({ embeds: [embeds.stopped()] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not stop.';
    await interaction.reply({ embeds: [embeds.error(message)], ephemeral: true });
  }
}
