import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { DisTube } from 'distube';
import { embeds } from '../utils/embeds';

export const data = new SlashCommandBuilder()
  .setName('queue')
  .setDescription('Show the current queue');

export async function execute(interaction: ChatInputCommandInteraction, distube: DisTube): Promise<void> {
  const queue = distube.getQueue(interaction.guildId!);
  if (!queue || queue.songs.length === 0) {
    await interaction.reply({ embeds: [embeds.error('Nothing is currently playing.')], ephemeral: true });
    return;
  }

  await interaction.reply({ embeds: [embeds.queueList(queue)] });
}
