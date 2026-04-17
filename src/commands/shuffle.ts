import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import type { DisTube } from 'distube';
import { embeds } from '../utils/embeds';

export const data = new SlashCommandBuilder()
  .setName('shuffle')
  .setDescription('Shuffle the queue');

export async function execute(interaction: ChatInputCommandInteraction, distube: DisTube): Promise<void> {
  const queue = distube.getQueue(interaction.guildId!);
  if (!queue) {
    await interaction.reply({ embeds: [embeds.error('Nothing is currently playing.')], flags: MessageFlags.Ephemeral });
    return;
  }

  if (queue.songs.length <= 1) {
    await interaction.reply({ embeds: [embeds.error('Nothing in the queue to shuffle.')], flags: MessageFlags.Ephemeral });
    return;
  }

  await queue.shuffle();
  await interaction.reply({ embeds: [embeds.shuffled()] });
}
