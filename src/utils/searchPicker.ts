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

// Module-level shared state — keyed by userId so each user has one pending search.
const pending = new Map<string, PendingSearch>();

const SEARCH_TIMEOUT_MS = 30_000;

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
  userId: string,
): ActionRowBuilder<StringSelectMenuBuilder> {
  const options = results.map(r =>
    new StringSelectMenuOptionBuilder()
      .setLabel(r.title.slice(0, 100))
      .setDescription(`${r.uploader} • ${formatDuration(r.duration)}`.slice(0, 100))
      .setValue(r.url),
  );

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`search:${userId}`)
    .setPlaceholder('Choose a song...')
    .addOptions(options);

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

/** Registers a pending search for a user with a 30-second expiry. */
export function registerPending(userId: string, entry: Omit<PendingSearch, 'timeout'>): void {
  // Cancel any previous pending search for this user
  cancelPending(userId);

  const timeout = setTimeout(() => expirePending(userId, entry.interaction), SEARCH_TIMEOUT_MS);
  pending.set(userId, { ...entry, timeout });
}

/**
 * Resolves a pending search (user made a selection).
 * Clears the timeout and removes from map. Returns the entry or undefined if expired.
 */
export function resolvePending(userId: string): PendingSearch | undefined {
  const entry = pending.get(userId);
  if (!entry) return undefined;
  clearTimeout(entry.timeout);
  pending.delete(userId);
  return entry;
}

/** Cancels a pending search without notifying the user (used when overwriting). */
function cancelPending(userId: string): void {
  const entry = pending.get(userId);
  if (entry) {
    clearTimeout(entry.timeout);
    pending.delete(userId);
  }
}

/** Called when the 30-second timeout fires — edits the reply to show expiry message. */
async function expirePending(userId: string, interaction: ChatInputCommandInteraction): Promise<void> {
  pending.delete(userId);
  try {
    await interaction.editReply({ content: 'Search timed out. Run the command again.', embeds: [], components: [] });
  } catch {
    // Interaction already gone — nothing to do
  }
}
