import { Events, OAuth2Scopes, PermissionFlagsBits, type Client } from 'discord.js';
import type { BotContext } from '../core/types.js';

/** Permissões mínimas que o bot precisa (o link de convite já sai com elas marcadas). */
export const REQUIRED_PERMISSIONS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.EmbedLinks,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.Connect,
  PermissionFlagsBits.Speak,
  PermissionFlagsBits.RequestToSpeak,
];

export function registerReadyHandler(client: Client, ctx: BotContext): void {
  client.once(Events.ClientReady, (ready) => {
    const invite = ready.generateInvite({
      scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
      permissions: REQUIRED_PERMISSIONS,
    });
    ctx.logger.info(`Conectado como ${ready.user.tag} em ${ready.guilds.cache.size} servidor(es).`);
    ctx.logger.info(`Link de convite: ${invite}`);
  });

  client.on(Events.Warn, (message) => ctx.logger.warn(message));
  client.on(Events.Error, (error) => ctx.logger.error({ err: error }, 'Erro no cliente do Discord'));
  client.on(Events.ShardDisconnect, (event, shardId) =>
    ctx.logger.warn({ code: event.code, shardId }, 'Desconectado do gateway do Discord (reconectando…)'),
  );
  client.on(Events.ShardResume, (shardId) => ctx.logger.info({ shardId }, 'Conexão com o gateway retomada'));
}
