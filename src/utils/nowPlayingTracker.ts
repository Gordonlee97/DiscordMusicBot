import type { Message } from 'discord.js';
import type { Queue, Song } from 'distube';
import { embeds } from './embeds';
import { createPlayerButtons } from './playerButtons';

interface TrackerState {
  interval: ReturnType<typeof setInterval>;
  message: Message;
}

// Active interval tracker — cleared on every song change or disconnect.
const trackers = new Map<string, TrackerState>();

// Last sent now-playing message — persists across tracker stops so that song
// loops (which fire finish → playSong in sequence) can reuse the message.
// Only cleared on true voice disconnect or channel leave.
const lastMessages = new Map<string, Message>();

const UPDATE_INTERVAL_MS = 5000;

export function startTracker(guildId: string, message: Message, queue: Queue, song: Song): void {
  stopTracker(guildId);
  lastMessages.set(guildId, message);

  const interval = setInterval(async () => {
    if (!queue.songs[0] || queue.songs[0] !== song) {
      stopTracker(guildId);
      return;
    }

    if (queue.paused) return;

    try {
      await message.edit({
        embeds: [embeds.nowPlayingCommand(song, queue.currentTime, queue.repeatMode)],
        components: [createPlayerButtons(queue)],
      });
    } catch {
      stopTracker(guildId);
    }
  }, UPDATE_INTERVAL_MS);

  trackers.set(guildId, { interval, message });
}

/** Returns the last now-playing message for a guild, even if the tracker has stopped. */
export function getLastMessage(guildId: string): Message | undefined {
  return lastMessages.get(guildId);
}

/** Stops the interval tracker but preserves the last message reference. */
export function stopTracker(guildId: string): void {
  const state = trackers.get(guildId);
  if (state) {
    clearInterval(state.interval);
    trackers.delete(guildId);
  }
}

/** Full teardown — stops tracker and clears the last message reference. */
export function clearTracker(guildId: string): void {
  stopTracker(guildId);
  lastMessages.delete(guildId);
}
