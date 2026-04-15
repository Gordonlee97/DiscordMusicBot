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

    const trackList = queued.length > 0
      ? queued
          .slice(0, 10)
          .map((s, i) => `**${i + 1}.** [${s.name ?? 'Unknown'}](${s.url}) \`${s.formattedDuration ?? '—'}\``)
          .join('\n')
      : 'No tracks queued.';

    const totalSeconds = queued.reduce((acc, s) => acc + (s.duration ?? 0), 0);
    const overflow = queued.length > 10 ? `\n*...and ${queued.length - 10} more*` : '';

    return new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: '🎵  Queue' })
      .addFields({ name: 'Now Playing', value: `[${current?.name ?? 'Unknown'}](${current?.url})` })
      .addFields({ name: 'Up Next', value: trackList + overflow })
      .addFields(
        { name: 'Total in Queue', value: String(queued.length), inline: true },
        { name: 'Total Duration', value: formatDuration(totalSeconds), inline: true },
      );
  },

  /** Used by /nowplaying command — includes progress bar */
  nowPlayingCommand(song: Song, currentTime: number): EmbedBuilder {
    const bar = progressBar(currentTime, song.duration ?? 0);
    const timeLabel = `${formatDuration(currentTime)} / ${song.formattedDuration ?? '—'}`;
    return new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: '▶  Now Playing' })
      .setTitle(song.name ?? 'Unknown')
      .setURL(song.url ?? null)
      .setThumbnail(song.thumbnail ?? null)
      .setDescription(`${bar}\n\`${timeLabel}\``)
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
      .setAuthor({ name: '⏹  Playback Stopped' })
      .setDescription('Queue is intact. Use `/resume` to continue or `/play` to add more.');
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

  /** Used for all error responses — always sent ephemeral */
  error(message: string): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: '❌  Error' })
      .setDescription(message);
  },
};
