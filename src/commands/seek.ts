import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import type { DisTube } from 'distube';
import { embeds } from '../utils/embeds';
import { formatDuration } from '../utils/formatters';

export const data = new SlashCommandBuilder()
  .setName('seek')
  .setDescription('Jump to a position in the current track')
  .addStringOption(opt =>
    opt.setName('time')
      .setDescription('Timestamp — e.g. 1:30, 90, or 1:30:00')
      .setRequired(true),
  );

/** Parses "90", "1:30", or "1:30:00" into seconds. Returns null if invalid. */
function parseTimestamp(input: string): number | null {
  if (/^\d+$/.test(input)) return parseInt(input, 10);

  const parts = input.split(':').map(Number);
  if (parts.some(isNaN) || parts.length < 2 || parts.length > 3) return null;

  if (parts.length === 2) {
    const [m, s] = parts;
    if (s >= 60) return null;
    return m * 60 + s;
  }

  const [h, m, s] = parts;
  if (m >= 60 || s >= 60) return null;
  return h * 3600 + m * 60 + s;
}

export async function execute(interaction: ChatInputCommandInteraction, distube: DisTube): Promise<void> {
  const queue = distube.getQueue(interaction.guildId!);
  if (!queue) {
    await interaction.reply({ embeds: [embeds.error('Nothing is currently playing.')], flags: MessageFlags.Ephemeral });
    return;
  }

  const input = interaction.options.getString('time', true);
  const seconds = parseTimestamp(input);

  if (seconds === null) {
    await interaction.reply({ embeds: [embeds.error('Invalid timestamp. Use formats like `1:30`, `90`, or `1:30:00`.')], flags: MessageFlags.Ephemeral });
    return;
  }

  const duration = queue.songs[0]?.duration ?? 0;
  if (duration > 0 && seconds >= duration) {
    await interaction.reply({ embeds: [embeds.error(`Timestamp exceeds track length (\`${queue.songs[0]?.formattedDuration ?? '—'}\`).`)], flags: MessageFlags.Ephemeral });
    return;
  }

  try {
    await queue.seek(seconds);
    await interaction.reply({ embeds: [embeds.seeked(formatDuration(seconds))] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not seek.';
    await interaction.reply({ embeds: [embeds.error(message)], flags: MessageFlags.Ephemeral });
  }
}
