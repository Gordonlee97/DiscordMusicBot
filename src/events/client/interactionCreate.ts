import { Interaction, MessageFlags } from 'discord.js';
import { embeds } from '../../utils/embeds';
import { resolvePending } from '../../utils/searchPicker';
import { createPlayerButtons } from '../../utils/playerButtons';

export const name = 'interactionCreate';
export const once = false;

export async function execute(interaction: Interaction): Promise<void> {
  // Handle playback button clicks
  if (interaction.isButton() && interaction.customId.startsWith('player:')) {
    const queue = interaction.client.distube.getQueue(interaction.guildId!);
    if (!queue) {
      await interaction.reply({ content: 'Nothing is currently playing.', flags: MessageFlags.Ephemeral });
      return;
    }

    const action = interaction.customId.slice('player:'.length);

    if (action === 'pause') {
      // Capture state BEFORE acting — DisTube may not update queue.paused synchronously,
      // so reading it after the call produces inverted button labels.
      const wasPaused = queue.paused;
      if (wasPaused) {
        queue.resume();
      } else {
        queue.pause();
      }
      await interaction.update({
        embeds: [embeds.nowPlayingCommand(queue.songs[0], queue.currentTime, queue.repeatMode)],
        components: [createPlayerButtons(queue, !wasPaused)],
      });
      return;
    }

    if (action === 'skip') {
      if (queue.songs.length <= 1) {
        await interaction.reply({ content: 'No next track to skip to.', flags: MessageFlags.Ephemeral });
        return;
      }
      await interaction.deferUpdate();
      await queue.skip();
      return;
    }

    if (action === 'loop') {
      const next = ((queue.repeatMode + 1) % 3) as 0 | 1 | 2;
      queue.setRepeatMode(next);
      await interaction.update({
        embeds: [embeds.nowPlayingCommand(queue.songs[0], queue.currentTime, next)],
        components: [createPlayerButtons(queue)],
      });
      return;
    }

    if (action === 'stop') {
      queue.pause();
      await interaction.update({
        embeds: [embeds.nowPlayingCommand(queue.songs[0], queue.currentTime, queue.repeatMode)],
        components: [createPlayerButtons(queue)],
      });
      return;
    }

    return;
  }

  // Handle search picker selections
  if (interaction.isStringSelectMenu() && interaction.customId.startsWith('search:')) {
    const interactionId = interaction.customId.slice('search:'.length);
    const entry = resolvePending(interactionId);

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
