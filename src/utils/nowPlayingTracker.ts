import type { Message } from 'discord.js';
import type { Queue, Song } from 'distube';
import { embeds } from './embeds';
import { createPlayerButtons } from './playerButtons';

interface TrackerState {
  interval: ReturnType<typeof setInterval>;
  message: Message;
}

// Keyed by guild ID — one live tracker per guild.
const trackers = new Map<string, TrackerState>();

const UPDATE_INTERVAL_MS = 5000;

/**
 * Starts a live-updating now-playing embed for the given guild.
 * Replaces any existing tracker for that guild.
 */
export function startTracker(guildId: string, message: Message, queue: Queue, song: Song): void {
  stopTracker(guildId);

  const interval = setInterval(async () => {
    // Stop if the song changed or queue is gone
    if (!queue.songs[0] || queue.songs[0] !== song) {
      stopTracker(guildId);
      return;
    }

    // Skip update while paused — time isn't advancing, keep interval alive
    if (queue.paused) return;

    try {
      await message.edit({
        embeds: [embeds.nowPlayingCommand(song, queue.currentTime, queue.repeatMode)],
        components: [createPlayerButtons(queue)],
      });
    } catch {
      // Message was deleted or bot lost permissions — stop tracking
      stopTracker(guildId);
    }
  }, UPDATE_INTERVAL_MS);

  trackers.set(guildId, { interval, message });
}

/** Stops the live tracker for a guild, if one is running. */
export function stopTracker(guildId: string): void {
  const state = trackers.get(guildId);
  if (state) {
    clearInterval(state.interval);
    trackers.delete(guildId);
  }
}
