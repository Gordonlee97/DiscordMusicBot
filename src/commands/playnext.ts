import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember, TextChannel } from 'discord.js';
import type { DisTube } from 'distube';
import { embeds } from '../utils/embeds';

export const data = new SlashCommandBuilder()
  .setName('playnext')
  .setDescription('Play a song next — inserts at the front of the queue')
  .addStringOption(opt =>
    opt.setName('query')
      .setDescription('YouTube URL, Spotify URL, SoundCloud URL, or search term')
      .setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction, distube: DisTube): Promise<void> {
  const member = interaction.member as GuildMember;
  const voiceChannel = member.voice.channel;

  if (!voiceChannel) {
    await interaction.reply({ embeds: [embeds.error('You need to be in a voice channel first.')], ephemeral: true });
    return;
  }

  const query = interaction.options.getString('query', true);
  await interaction.deferReply({ ephemeral: true });

  try {
    await distube.play(voiceChannel, query, {
      member,
      textChannel: interaction.channel as TextChannel,
      position: 1,
    });
    await interaction.deleteReply();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Something went wrong.';
    const isYouTubeBlock = message.toLowerCase().includes('sign in to confirm');
    await interaction.editReply({
      embeds: [embeds.error(isYouTubeBlock ? 'YouTube is blocking this request. Try again in a moment.' : message)],
    });
  }
}
