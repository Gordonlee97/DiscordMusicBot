import { Interaction, MessageFlags } from 'discord.js';
import { embeds } from '../../utils/embeds';
import { resolvePending } from '../../utils/searchPicker';

export const name = 'interactionCreate';
export const once = false;

export async function execute(interaction: Interaction): Promise<void> {
  // Handle search picker selections
  if (interaction.isStringSelectMenu() && interaction.customId.startsWith('search:')) {
    const userId = interaction.customId.slice('search:'.length);
    const entry = resolvePending(userId);

    if (!entry) {
      await interaction.reply({ content: 'This search has expired. Run the command again.', flags: MessageFlags.Ephemeral });
      return;
    }

    // Acknowledge the select interaction without sending a new visible message
    await interaction.deferUpdate();

    try {
      const selectedUrl = interaction.values[0];
      await interaction.client.distube.play(entry.voiceChannel, selectedUrl, {
        member: entry.member,
        textChannel: entry.textChannel,
        ...(entry.position !== undefined && { position: entry.position }),
      });
      await entry.interaction.deleteReply();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong.';
      await entry.interaction.editReply({ embeds: [embeds.error(message)], components: [] });
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) {
    await interaction.reply({ embeds: [embeds.error(`Unknown command: ${interaction.commandName}`)], flags: MessageFlags.Ephemeral });
    return;
  }

  try {
    await command.execute(interaction, interaction.client.distube);
  } catch (error) {
    console.error(`[Command:${interaction.commandName}]`, error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ embeds: [embeds.error(message)] });
    } else {
      await interaction.reply({ embeds: [embeds.error(message)], flags: MessageFlags.Ephemeral });
    }
  }
}
