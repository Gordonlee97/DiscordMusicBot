import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import type { DisTube } from 'distube';
import { embeds } from '../utils/embeds';

export const data = new SlashCommandBuilder()
  .setName('clear')
  .setDescription('Clear the queue — current track keeps playing');

export async function execute(interaction: ChatInputCommandInteraction, distube: DisTube): Promise<void> {
  const queue = distube.getQueue(interaction.guildId!);
  if (!queue || queue.songs.length <= 1) {
    await interaction.reply({ embeds: [embeds.error('There are no queued tracks to clear.')], flags: MessageFlags.Ephemeral });
    return;
  }

  // songs[0] is currently playing — remove everything after it
  queue.songs.splice(1);
  await interaction.reply({ embeds: [embeds.cleared()] });
}
