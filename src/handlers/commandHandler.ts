import { readdirSync } from 'fs';
import { join } from 'path';
import { Collection, REST, Routes, Client } from 'discord.js';
import type { Command } from '../types';

export async function loadCommands(client: Client): Promise<void> {
  client.commands = new Collection();
  const commandsPath = join(__dirname, '..', 'commands');

  for (const file of readdirSync(commandsPath).filter(f => f.endsWith('.js') || f.endsWith('.ts'))) {
    const command: Command = await import(join(commandsPath, file));
    client.commands.set(command.data.name, command);
  }

  console.log(`[Commands] Loaded ${client.commands.size} command(s).`);
}

export async function registerCommands(client: Client): Promise<void> {
  const rest = new REST().setToken(process.env['DISCORD_TOKEN']!);
  const body = [...client.commands.values()].map(c => c.data.toJSON());
  const clientId = process.env['CLIENT_ID']!;
  const guildId = process.env['GUILD_ID'];

  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body });
    console.log(`[Commands] Registered ${body.length} guild command(s) to guild ${guildId}.`);
  } else {
    await rest.put(Routes.applicationCommands(clientId), { body });
    console.log(`[Commands] Registered ${body.length} global command(s). May take up to 1 hour to appear.`);
  }
}
