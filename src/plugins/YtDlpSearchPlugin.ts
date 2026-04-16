import { ExtractorPlugin, Song, Playlist, ResolveOptions } from 'distube';
import { json } from '@distube/yt-dlp';

/**
 * ExtractorPlugin (type "extractor") that handles plain-text search queries.
 *
 * DisTube v5 routes text search through ExtractorPlugin.searchSong() only — the
 * @distube/yt-dlp PlayableExtractorPlugin handles URL resolution but not search.
 * This plugin bridges the gap by prepending "ytsearch1:" and calling yt-dlp.
 */
export class YtDlpSearchPlugin extends ExtractorPlugin {
  // We only handle text search, not URL resolution.
  validate(): boolean {
    return false;
  }

  // Required by abstract class; never called because validate() returns false.
  async resolve<T>(_url: string, _options: ResolveOptions<T>): Promise<Song<T> | Playlist<T>> {
    throw new Error('YtDlpSearchPlugin does not resolve URLs');
  }

  async searchSong<T>(query: string, options: ResolveOptions<T>): Promise<Song<T> | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await json(`ytsearch1:${query}`, {
      dumpSingleJson: true,
      noWarnings: true,
      skipDownload: true,
      simulate: true,
    }).catch(() => null);

    if (!result) return null;

    // ytsearch1: returns a playlist wrapper with one entry
    const info = Array.isArray(result.entries) && result.entries.length > 0
      ? result.entries[0]
      : result;

    if (!info?.webpage_url) return null;

    return new Song<T>(
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        plugin: this as any,
        source: info.extractor ?? 'youtube',
        playFromSource: true,
        id: String(info.id),
        name: info.title || info.fulltitle || query,
        url: info.webpage_url || info.original_url,
        isLive: Boolean(info.is_live),
        duration: typeof info.duration === 'number' ? info.duration : 0,
        thumbnail: info.thumbnail ?? info.thumbnails?.[0]?.url,
        uploader: info.uploader ? { name: info.uploader, url: info.uploader_url } : undefined,
      },
      options,
    );
  }

  getRelatedSongs(): never[] {
    return [];
  }

  async getStreamURL<T>(song: Song<T>): Promise<string> {
    if (!song.url) throw new Error('No URL attached to song');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const info: any = await json(song.url, {
      dumpSingleJson: true,
      noWarnings: true,
      preferFreeFormats: true,
      skipDownload: true,
      simulate: true,
      format: 'ba/ba*',
    });

    const streamUrl: string | undefined = info.url;
    if (!streamUrl) throw new Error(`No stream URL found for: ${song.url}`);
    return streamUrl;
  }
}
