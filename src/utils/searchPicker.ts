import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  GuildMember,
  TextChannel,
  VoiceBasedChannel,
} from 'discord.js';
import type { SearchResult } from '../plugins/YtDlpSearchPlugin';

export interface PendingSearch {
  voiceChannel: VoiceBasedChannel;
  textChannel: TextChannel;
  member: GuildMember;
  position?: number;       // undefined = add to end, 1 = playnext
  timeout: ReturnType<typeof setTimeout>;
  interaction: ChatInputCommandInteraction;
  results: SearchResult[];
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

/**
 * Builds a row of numbered buttons (1–N) for each search result.
 * customId format: search:${interactionId}:${index}
 */
export function createComponents(
  results: SearchResult[],
  interactionId: string,
): ActionRowBuilder<ButtonBuilder> {
  const buttons = results.map((_, i) =>
    new ButtonBuilder()
      .setCustomId(`search:${interactionId}:${i}`)
      .setLabel(String(i + 1))
      .setStyle(ButtonStyle.Primary),
  );
  return new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons);
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

/** Called when the 2-minute timeout fires — edits the reply to show expiry message. */
async function expirePending(interactionId: string, interaction: ChatInputCommandInteraction): Promise<void> {
  pending.delete(interactionId);
  try {
    await interaction.editReply({ content: 'Search timed out. Run the command again.', embeds: [], components: [] });
  } catch {
    // Interaction already gone — nothing to do
  }
}
