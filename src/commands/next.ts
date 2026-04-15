import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { DisTube } from 'distube';
import { embeds } from '../utils/embeds';

export const data = new SlashCommandBuilder()
  .setName('next')
  .setDescription('Move a queued track to play next')
  .addIntegerOption(opt =>
    opt.setName('position')
      .setDescription('Queue position of the track to move (shown in /queue)')
      .setRequired(true)
      .setMinValue(2),
  );

export async function execute(interaction: ChatInputCommandInteraction, distube: DisTube): Promise<void> {
  const queue = distube.getQueue(interaction.guildId!);
  if (!queue || queue.songs.length < 3) {
    await interaction.reply({ embeds: [embeds.error('You need at least 2 queued tracks to reorder.')], ephemeral: true });
    return;
  }

  const position = interaction.options.getInteger('position', true);
  // queue.songs[0] = currently playing
  // queue display position 1 = queue.songs[1], position N = queue.songs[N]
  const maxPosition = queue.songs.length - 1;

  if (position > maxPosition) {
    await interaction.reply({
      embeds: [embeds.error(`Position must be between 2 and ${maxPosition}.`)],
      ephemeral: true,
    });
    return;
  }

  const [song] = queue.songs.splice(position, 1);
  queue.songs.splice(1, 0, song);

  await interaction.reply({ embeds: [embeds.nextUp(song)] });
}
