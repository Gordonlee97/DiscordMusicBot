import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import type { DisTube } from 'distube';
import { embeds } from '../utils/embeds';

export const data = new SlashCommandBuilder()
  .setName('loop')
  .setDescription('Cycle loop mode: off → song → queue → off');

export async function execute(interaction: ChatInputCommandInteraction, distube: DisTube): Promise<void> {
  const queue = distube.getQueue(interaction.guildId!);
  if (!queue) {
    await interaction.reply({ embeds: [embeds.error('Nothing is currently playing.')], flags: MessageFlags.Ephemeral });
    return;
  }

  const next = ((queue.repeatMode + 1) % 3) as 0 | 1 | 2;
  queue.setRepeatMode(next);
  await interaction.reply({ embeds: [embeds.looped(next)] });
}
