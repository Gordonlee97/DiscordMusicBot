import { readdirSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import type { Client } from 'discord.js';
import type { DisTube } from 'distube';

export async function loadEvents(client: Client, distube: DisTube): Promise<void> {
  // Client events
  const clientEventsPath = join(__dirname, '..', 'events', 'client');
  for (const file of readdirSync(clientEventsPath).filter(f => f.endsWith('.js') || f.endsWith('.ts'))) {
    const event = await import(pathToFileURL(join(clientEventsPath, file)).href);
    if (event.once) {
      client.once(event.name, (...args: unknown[]) => event.execute(...args));
    } else {
      client.on(event.name, (...args: unknown[]) => event.execute(...args));
    }
  }

  // DisTube events
  const distubeEventsPath = join(__dirname, '..', 'events', 'distube');
  for (const file of readdirSync(distubeEventsPath).filter(f => f.endsWith('.js') || f.endsWith('.ts'))) {
    const event = await import(pathToFileURL(join(distubeEventsPath, file)).href);
    distube.on(event.name, (...args: unknown[]) => event.execute(...args));
  }

  console.log('[Events] Client and DisTube events loaded.');
}
