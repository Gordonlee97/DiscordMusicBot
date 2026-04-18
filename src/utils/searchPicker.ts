import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ChatInputCommandInteraction,
  GuildMember,
  TextChannel,
  VoiceBasedChannel,
  MessageFlags,
} from 'discord.js';
import type { SearchResult } from '../plugins/YtDlpSearchPlugin';
import { formatDuration } from './formatters';

export interface PendingSearch {
  voiceChannel: VoiceBasedChannel;
  textChannel: TextChannel;
  member: GuildMember;
  position?: number;       // undefined = add to end, 1 = playnext
  timeout: ReturnType<typeof setTimeout>;
  interaction: ChatInputCommandInteraction;
}

// Keyed by interactionId — unique per command invocation, so multiple
// concurrent pickers from the same user never overwrite each other.
const pending = new Map<string, PendingSearch>();

const SEARCH_TIMEOUT_MS = 120_000; // 2 minutes

/** Returns true if the string is a playable URL (https/http, no spaces). */
export function isUrl(str: string): boolean {
  if (str.includes(' ')) return false;
  try {
    const url = new URL(str);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Builds the Discord ActionRow containing the search result select menu. */
export function createComponents(
  results: SearchResult[],
  interactionId: string,
): ActionRowBuilder<StringSelectMenuBuilder> {
  const options = results.map(r =>
    new StringSelectMenuOptionBuilder()
      .setLabel(r.title.slice(0, 100))
      .setDescription(`${r.uploader} • ${formatDuration(r.duration)}`.slice(0, 100))
      .setValue(r.url),
  );

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`search:${interactionId}`)
    .setPlaceholder('Choose a song...')
    .addOptions(options);

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

/** Registers a pending search keyed by the originating interaction ID. */
export function registerPending(interactionId: string, entry: Omit<PendingSearch, 'timeout'>): void {
  const timeout = setTimeout(() => expirePending(interactionId, entry.interaction), SEARCH_TIMEOUT_MS);
  pending.set(interactionId, { ...entry, timeout });
}

/**
 * Resolves a pending search (user made a selection).
 * Clears the timeout and removes from map. Returns the entry or undefined if expired.
 */
export function resolvePending(interactionId: string): PendingSearch | undefined {
  const entry = pending.get(interactionId);
  if (!entry) return undefined;
  clearTimeout(entry.timeout);
  pending.delete(interactionId);
  return entry;
}

/** Called when the 30-second timeout fires — edits the reply to show expiry message. */
async function expirePending(interactionId: string, interaction: ChatInputCommandInteraction): Promise<void> {
  pending.delete(interactionId);
  try {
    await interaction.editReply({ content: 'Search timed out. Run the command again.', embeds: [], components: [] });
  } catch {
    // Interaction already gone — nothing to do
  }
}
