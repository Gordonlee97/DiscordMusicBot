import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import type { DisTube } from 'distube';
import { embeds } from '../utils/embeds';

export const data = new SlashCommandBuilder()
  .setName('nowplaying')
  .setDescription('Show the currently playing track with progress');

export async function execute(interaction: ChatInputCommandInteraction, distube: DisTube): Promise<void> {
  const queue = distube.getQueue(interaction.guildId!);
  if (!queue || !queue.songs[0]) {
    await interaction.reply({ embeds: [embeds.error('Nothing is currently playing.')], flags: MessageFlags.Ephemeral });
    return;
  }

  const song = queue.songs[0];
  const currentTime = queue.currentTime;

  await interaction.reply({ embeds: [embeds.nowPlayingCommand(song, currentTime)] });
}
