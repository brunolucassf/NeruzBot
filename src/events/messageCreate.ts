import { Events, type ChatInputCommandInteraction, type Client } from 'discord.js';
import { enforceCooldown } from '../core/cooldown.js';
import { UserError } from '../core/errors.js';
import type { BotContext } from '../core/types.js';
import { MessageInteraction } from '../prefix/MessageInteraction.js';
import { findPrefixSpec, parsePrefixMessage } from '../prefix/registry.js';
import { errorEmbed } from '../ui/embeds.js';

const MAX_MESSAGE_LENGTH = 700;

/** Comandos digitados no chat: "n!play ..." ou "n.play ...". */
export function registerMessageHandler(client: Client, ctx: BotContext): void {
  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.inGuild() || message.content.length > MAX_MESSAGE_LENGTH) return;

    const parsed = parsePrefixMessage(message.content);
    if (!parsed) return;

    const reply = (text: string) =>
      message
        .reply({ embeds: [errorEmbed(text)], allowedMentions: { parse: [], repliedUser: false }, failIfNotExists: false })
        .catch(() => {});

    const spec = findPrefixSpec(parsed.name);
    if (!spec) {
      // "n." aparece em frases normais; só o "n!" responde a comandos desconhecidos.
      if (parsed.kind === '!') await reply(`Não conheço o comando \`${parsed.name.slice(0, 30)}\`. Use \`n!ajuda\` para ver a lista.`);
      return;
    }

    try {
      enforceCooldown(message.author.id);
      const player = ctx.players.get(message.guildId);
      const slashName = typeof spec.slash === 'function' ? spec.slash({ isPaused: player?.isPaused ?? false }) : spec.slash;
      const command = ctx.commands.get(slashName);
      if (!command) throw new Error(`Comando de barra ausente: ${slashName}`);

      const interaction = new MessageInteraction(message, slashName, spec.parse(parsed.args, message));
      await command.execute(interaction as unknown as ChatInputCommandInteraction<'cached'>, ctx);
      ctx.logger.debug({ command: spec.id, user: message.author.id }, 'Comando de prefixo executado');
    } catch (error) {
      if (!(error instanceof UserError)) ctx.logger.error({ err: error, command: spec.id }, 'Erro em comando de prefixo');
      await reply(error instanceof UserError ? error.message : 'Ocorreu um erro inesperado. Tente novamente em instantes.');
    }
  });
}
