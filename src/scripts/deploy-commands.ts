/**
 * Registra os comandos de barra (/play, /skip...) na API do Discord.
 *
 *   npm run commands:deploy              -> no servidor DISCORD_GUILD_ID (instantâneo) ou global se não houver
 *   npm run commands:deploy -- --global  -> global (todos os servidores)
 *   npm run commands:deploy -- --clear   -> remove os comandos do destino escolhido
 *
 * Só é necessário rodar de novo quando nomes, descrições ou opções dos comandos mudarem.
 */
import { REST, Routes, type APIApplication } from 'discord.js';
import { commandList } from '../commands/index.js';
import { config } from '../config.js';

const args = new Set(process.argv.slice(2));
const global = args.has('--global') || !config.DISCORD_GUILD_ID;
const clear = args.has('--clear');

const rest = new REST().setToken(config.DISCORD_TOKEN);
const application = (await rest.get(Routes.currentApplication())) as APIApplication;
const body = clear ? [] : commandList.map((command) => command.data.toJSON());

const route = global
  ? Routes.applicationCommands(application.id)
  : Routes.applicationGuildCommands(application.id, config.DISCORD_GUILD_ID!);

const result = (await rest.put(route, { body })) as unknown[];
const target = global ? 'globalmente' : `no servidor ${config.DISCORD_GUILD_ID}`;

if (clear) {
  console.log(`🧹 Comandos removidos ${target}.`);
} else {
  console.log(`✅ ${result.length} comandos registrados ${target} para "${application.name}".`);
  if (global) console.log('   Comandos globais podem levar alguns minutos para aparecer no Discord.');
}
