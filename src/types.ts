import { Collection, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { DisTube } from 'distube';

export interface Command {
  data: SlashCommandBuilder | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;
  execute: (interaction: ChatInputCommandInteraction, distube: DisTube) => Promise<void>;
}

export interface ClientEvent {
  name: string;
  once?: boolean;
  execute: (...args: unknown[]) => Promise<void> | void;
}

export interface DistubeEvent {
  name: string;
  execute: (...args: unknown[]) => Promise<void> | void;
}

// Augment the discord.js Client so commands and distube are accessible anywhere
declare module 'discord.js' {
  interface Client {
    commands: Collection<string, Command>;
    distube: DisTube;
  }
}
