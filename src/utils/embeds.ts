import { EmbedBuilder } from 'discord.js';
import type { Song, Playlist, Queue } from 'distube';
import { formatDuration, progressBar } from './formatters';

const COLOR = 0xff0000; // YouTube red

function requesterName(song: Song): string {
  return song.member?.displayName ?? 'Unknown';
}

export const embeds = {
  /** Fired by playSong event when a single track starts playing */
  nowPlayingTrack(song: Song): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: '▶  Now Playing' })
      .setTitle(song.name ?? 'Unknown')
      .setURL(song.url ?? null)
      .setThumbnail(song.thumbnail ?? null)
      .addFields(
        { name: 'Duration', value: song.formattedDuration ?? '—', inline: true },
        { name: 'Requested by', value: requesterName(song), inline: true },
      );
  },

  /** Fired by playList event when a playlist starts playing */
  nowPlayingPlaylist(playlist: Playlist, song: Song): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: '▶  Now Playing Playlist' })
      .setTitle(playlist.name ?? 'Unknown Playlist')
      .setURL(playlist.url ?? null)
      .setThumbnail(playlist.thumbnail ?? null)
      .addFields(
        { name: 'First Track', value: song.name ?? 'Unknown', inline: true },
        { name: 'Total Tracks', value: String(playlist.songs.length), inline: true },
        { name: 'Requested by', value: requesterName(song), inline: true },
      );
  },

  /** Fired by addSong event when a track is queued behind an existing track */
  addedToQueue(song: Song, position: number): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: '➕  Added to Queue' })
      .setTitle(song.name ?? 'Unknown')
      .setURL(song.url ?? null)
      .addFields(
        { name: 'Duration', value: song.formattedDuration ?? '—', inline: true },
        { name: 'Position', value: `#${position}`, inline: true },
        { name: 'Requested by', value: requesterName(song), inline: true },
      );
  },

  /** Fired by addList event when a playlist is queued */
  playlistAdded(playlist: Playlist): EmbedBuilder {
    const requester = playlist.songs[0] ? requesterName(playlist.songs[0]) : 'Unknown';
    return new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: '➕  Playlist Added to Queue' })
      .setTitle(playlist.name ?? 'Unknown Playlist')
      .setURL(playlist.url ?? null)
      .addFields(
        { name: 'Tracks', value: String(playlist.songs.length), inline: true },
        { name: 'Requested by', value: requester, inline: true },
      );
  },

  /** Used by /queue command */
  queueList(queue: Queue): EmbedBuilder {
    const songs = queue.songs;
    const current = songs[0];
    const queued = songs.slice(1);

    const FIELD_LIMIT = 1024;
    const OVERFLOW_RESERVE = 30; // chars reserved for the "...and N more" line
    const NAME_MAX = 50;

    let upNextValue: string;
    if (queued.length === 0) {
      upNextValue = 'No tracks queued.';
    } else {
      const candidate = queued.slice(0, 10);
      const lines: string[] = [];

      for (let i = 0; i < candidate.length; i++) {
        const s = candidate[i];
        const rawName = s.name ?? 'Unknown';
        const name = rawName.length > NAME_MAX ? rawName.slice(0, NAME_MAX) + '…' : rawName;
        const url = s.url ?? '';
        const line = `**${i + 1}.** [${name}](${url}) \`${s.formattedDuration ?? '—'}\``;
        lines.push(line);
      }

      // Trim lines from the bottom until the joined string + overflow fits within the field limit.
      // lines.length === 1 is the safety floor — never drop the last entry.
      while (lines.length > 1) {
        const totalDropped = queued.length - lines.length;
        const overflowLine = totalDropped > 0 ? `\n*...and ${totalDropped} more*` : '';
        const joined = lines.join('\n') + overflowLine;
        if (joined.length <= FIELD_LIMIT - OVERFLOW_RESERVE) break;
        lines.pop();
      }

      // Build final value with accurate dropped count after trimming.
      const finalDropped = queued.length - lines.length;
      const finalOverflow = finalDropped > 0 ? `\n*...and ${finalDropped} more*` : '';
      upNextValue = lines.join('\n') + finalOverflow;
    }

    const totalSeconds = queued.reduce((acc, s) => acc + (s.duration ?? 0), 0);
    const nowPlayingUrl = current?.url ?? '';

    return new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: '🎵  Queue' })
      .addFields({ name: 'Now Playing', value: `[${current?.name ?? 'Unknown'}](${nowPlayingUrl})` })
      .addFields({ name: 'Up Next', value: upNextValue })
      .addFields(
        { name: 'Total in Queue', value: String(queued.length), inline: true },
        { name: 'Total Duration', value: formatDuration(totalSeconds), inline: true },
      );
  },

  /** Used by /nowplaying command and live tracker — includes progress bar and optional repeat mode indicator */
  nowPlayingCommand(song: Song, currentTime: number, repeatMode = 0): EmbedBuilder {
    const bar = progressBar(currentTime, song.duration ?? 0);
    const timeLabel = `${formatDuration(currentTime)} / ${song.formattedDuration ?? '—'}`;
    const loopLine = repeatMode === 1 ? '\n🔂 Looping song' : repeatMode === 2 ? '\n🔁 Looping queue' : '';
    return new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: '▶  Now Playing' })
      .setTitle(song.name ?? 'Unknown')
      .setURL(song.url ?? null)
      .setThumbnail(song.thumbnail ?? null)
      .setDescription(`${bar}\n\`${timeLabel}\`${loopLine}`)
      .addFields({ name: 'Requested by', value: requesterName(song), inline: true });
  },

  /** Fired by finish event */
  queueFinished(): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: '✅  Queue Finished' })
      .setDescription('Nothing left to play. Add more songs or I\'ll leave in **10 minutes**.');
  },

  /** Used by /stop command */
  stopped(): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: '⏹  Stopped' })
      .setDescription('Current song removed. Use `/resume` to play the next track.');
  },

  /** Used by /skip command */
  skipped(): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: '⏭  Skipped' })
      .setDescription('Playing the next track.');
  },

  /** Used by /pause command */
  paused(): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: '⏸  Paused' })
      .setDescription('Use `/resume` to continue.');
  },

  /** Used by /resume command */
  resumed(): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: '▶  Resumed' })
      .setDescription('Playback resumed.');
  },

  /** Used by /clear command */
  cleared(): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: '🗑  Queue Cleared' })
      .setDescription('The queue has been cleared. Current track will finish playing.');
  },

  /** Used by /next command */
  nextUp(song: Song): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: '⏭  Playing Next' })
      .setTitle(song.name ?? 'Unknown')
      .setURL(song.url ?? null);
  },

  /** Used by /loop command */
  looped(mode: 0 | 1 | 2): EmbedBuilder {
    const labels: Record<0 | 1 | 2, string> = { 0: '➡️  Loop Off', 1: '🔂  Looping Song', 2: '🔁  Looping Queue' };
    const descriptions: Record<0 | 1 | 2, string> = {
      0: 'Loop disabled.',
      1: 'Current song will repeat.',
      2: 'Entire queue will repeat.',
    };
    return new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: labels[mode] })
      .setDescription(descriptions[mode]);
  },

  /** Used by /shuffle command */
  shuffled(): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: '🔀  Queue Shuffled' })
      .setDescription('The queue has been shuffled.');
  },

  /** Used by /seek command */
  seeked(timestamp: string): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: '⏩  Seeked' })
      .setDescription(`Jumped to \`${timestamp}\`.`);
  },

  /** Used for all error responses — always sent ephemeral */
  error(message: string): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: '❌  Error' })
      .setDescription(message);
  },
};
