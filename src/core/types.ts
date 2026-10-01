import type {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  Client,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js';
import type { Config } from '../config.js';
import type { PlayerManager } from '../music/PlayerManager.js';
import type { TrackResolver } from '../music/TrackResolver.js';
import type { Logger } from './logger.js';

export interface BotContext {
  client: Client;
  config: Config;
  logger: Logger;
  players: PlayerManager;
  resolver: TrackResolver;
  commands: ReadonlyMap<string, Command>;
}

export type CommandCategory = 'Tocar' | 'Controle' | 'Fila' | 'Geral';

export interface Command {
  category: CommandCategory;
  data: { name: string; toJSON(): RESTPostAPIChatInputApplicationCommandsJSONBody };
  execute(interaction: ChatInputCommandInteraction<'cached'>, ctx: BotContext): Promise<void>;
  autocomplete?(interaction: AutocompleteInteraction<'cached'>, ctx: BotContext): Promise<void>;
}
