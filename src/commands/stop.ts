import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import type { DisTube } from 'distube';
import { embeds } from '../utils/embeds';

export const data = new SlashCommandBuilder()
  .setName('stop')
  .setDescription('Remove the current song and stop — next song will be ready to play');

export async function execute(interaction: ChatInputCommandInteraction, distube: DisTube): Promise<void> {
  const queue = distube.getQueue(interaction.guildId!);
  if (!queue) {
    await interaction.reply({ embeds: [embeds.error('Nothing is currently playing.')], flags: MessageFlags.Ephemeral });
    return;
  }

  try {
    if (queue.songs.length > 1) {
      // Skip removes the current song; playSong fires for the next one, then we pause it.
      await queue.skip();
      queue.pause();
    } else {
      // Last song — nothing left to preserve, just leave voice.
      queue.voice.leave();
    }
    await interaction.reply({ embeds: [embeds.stopped()], flags: MessageFlags.Ephemeral });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not stop.';
    await interaction.reply({ embeds: [embeds.error(message)], flags: MessageFlags.Ephemeral });
  }
}
