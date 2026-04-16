import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import type { DisTube } from 'distube';
import { embeds } from '../utils/embeds';

export const data = new SlashCommandBuilder()
  .setName('skip')
  .setDescription('Skip the current track');

export async function execute(interaction: ChatInputCommandInteraction, distube: DisTube): Promise<void> {
  const queue = distube.getQueue(interaction.guildId!);
  if (!queue) {
    await interaction.reply({ embeds: [embeds.error('Nothing is currently playing.')], flags: MessageFlags.Ephemeral });
    return;
  }

  if (queue.songs.length <= 1) {
    await interaction.reply({ embeds: [embeds.error('No next track to skip to.')], flags: MessageFlags.Ephemeral });
    return;
  }

  try {
    await queue.skip();
    await interaction.reply({ embeds: [embeds.skipped()] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not skip.';
    await interaction.reply({ embeds: [embeds.error(message)], flags: MessageFlags.Ephemeral });
  }
}
