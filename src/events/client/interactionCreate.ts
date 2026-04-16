import { Interaction, MessageFlags } from 'discord.js';
import { embeds } from '../../utils/embeds';

export const name = 'interactionCreate';
export const once = false;

export async function execute(interaction: Interaction): Promise<void> {
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
