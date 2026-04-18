import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  GuildMember,
  TextChannel,
  MessageFlags,
  EmbedBuilder,
} from 'discord.js';
import type { DisTube } from 'distube';
import { embeds } from '../utils/embeds';
import { isUrl, createComponents, registerPending } from '../utils/searchPicker';
import { YtDlpSearchPlugin } from '../plugins/YtDlpSearchPlugin';

export const data = new SlashCommandBuilder()
  .setName('play')
  .setDescription('Play a song or playlist — adds to the back of the queue')
  .addStringOption(opt =>
    opt.setName('query')
      .setDescription('YouTube URL, Spotify URL, SoundCloud URL, or search term')
      .setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction, distube: DisTube): Promise<void> {
  const member = interaction.member as GuildMember;
  const voiceChannel = member.voice.channel;

  if (!voiceChannel) {
    await interaction.reply({ embeds: [embeds.error('You need to be in a voice channel first.')], flags: MessageFlags.Ephemeral });
    return;
  }

  const query = interaction.options.getString('query', true);

  // URL path — play immediately, no picker needed
  if (isUrl(query)) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      await distube.play(voiceChannel, query, {
        member,
        textChannel: interaction.channel as TextChannel,
      });
      await interaction.deleteReply();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong.';
      const isYouTubeBlock = message.toLowerCase().includes('sign in to confirm');
      await interaction.editReply({
        embeds: [embeds.error(isYouTubeBlock ? 'YouTube is blocking this request. Try again in a moment.' : message)],
      });
    }
    return;
  }

  // Search path — show picker with top 5 results
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const plugin = distube.plugins.find(p => p instanceof YtDlpSearchPlugin) as YtDlpSearchPlugin | undefined;
  if (!plugin) {
    await interaction.editReply({ embeds: [embeds.error('Search is unavailable.')] });
    return;
  }

  const results = await plugin.searchMultiple(query);
  if (results.length === 0) {
    await interaction.editReply({ embeds: [embeds.error(`No results found for: **${query}**`)] });
    return;
  }

  const resultList = results
    .map((r, i) => `**${i + 1}.** ${r.title} — \`${r.uploader}\``)
    .join('\n');

  const searchEmbed = new EmbedBuilder()
    .setColor(0xff0000)
    .setAuthor({ name: '🔍  Search Results' })
    .setDescription(resultList)
    .setFooter({ text: 'Selection expires in 30 seconds' });

  await interaction.editReply({
    embeds: [searchEmbed],
    components: [createComponents(results, interaction.id)],
  });

  registerPending(interaction.id, {
    voiceChannel,
    textChannel: interaction.channel as TextChannel,
    member,
    position: undefined,
    interaction,
  });
}
