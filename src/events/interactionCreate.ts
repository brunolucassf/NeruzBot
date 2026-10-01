import {
  Events,
  MessageFlags,
  type AutocompleteInteraction,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type Client,
  type RepliableInteraction,
} from 'discord.js';
import { showQueue } from '../commands/queue.js';
import { enforceCooldown } from '../core/cooldown.js';
import { UserError } from '../core/errors.js';
import type { BotContext } from '../core/types.js';
import { LOOP_CYCLE, PLAYER_BUTTON_PREFIX, type PlayerButtonAction } from '../ui/components.js';
import { errorEmbed, successEmbed, trackLink } from '../ui/embeds.js';
import { requireControllablePlayer } from '../utils/voice.js';

const GENERIC_ERROR = 'Ocorreu um erro inesperado. Tente novamente em instantes.';

async function replyWithError(interaction: RepliableInteraction, message: string): Promise<void> {
  const embeds = [errorEmbed(message)];
  if (interaction.isMessageComponent() && (interaction.deferred || interaction.replied)) {
    await interaction.followUp({ embeds, flags: MessageFlags.Ephemeral });
  } else if (interaction.deferred || interaction.replied) {
    await interaction.editReply({ embeds, components: [] });
  } else {
    await interaction.reply({ embeds, flags: MessageFlags.Ephemeral });
  }
}

async function handleError(interaction: RepliableInteraction, ctx: BotContext, error: unknown, label: string): Promise<void> {
  if (!(error instanceof UserError)) ctx.logger.error({ err: error, interaction: label }, 'Erro ao processar interação');
  await replyWithError(interaction, error instanceof UserError ? error.message : GENERIC_ERROR).catch(() => {});
}

async function handleCommand(interaction: ChatInputCommandInteraction<'cached'>, ctx: BotContext): Promise<void> {
  const command = ctx.commands.get(interaction.commandName);
  if (!command) {
    await replyWithError(interaction, 'Comando desconhecido. Talvez ele tenha sido removido — rode o deploy dos comandos.');
    return;
  }
  const startedAt = Date.now();
  try {
    enforceCooldown(interaction.user.id);
    await command.execute(interaction, ctx);
    ctx.logger.debug({ command: command.data.name, user: interaction.user.id, ms: Date.now() - startedAt }, 'Comando executado');
  } catch (error) {
    await handleError(interaction, ctx, error, `/${interaction.commandName}`);
  }
}

async function handleAutocomplete(interaction: AutocompleteInteraction<'cached'>, ctx: BotContext): Promise<void> {
  const command = ctx.commands.get(interaction.commandName);
  try {
    await command?.autocomplete?.(interaction, ctx);
  } catch (error) {
    // Autocomplete expira em 3 s; falhar aqui não deve incomodar o usuário.
    ctx.logger.debug({ err: error }, 'Falha no autocomplete');
  }
}

async function handlePlayerButton(interaction: ButtonInteraction<'cached'>, ctx: BotContext): Promise<void> {
  const action = interaction.customId.slice(PLAYER_BUTTON_PREFIX.length) as PlayerButtonAction;
  try {
    if (action === 'queue') {
      const player = ctx.players.get(interaction.guildId);
      if (!player?.currentTrack) throw new UserError('Não há nada tocando agora.');
      await showQueue(interaction, player, { ephemeral: true });
      return;
    }

    const player = requireControllablePlayer(interaction.member, ctx.players, { requireTrack: action !== 'stop' });
    // Os botões também aparecem no /nowplaying, que mostra a barra de progresso.
    const isMainMessage = interaction.message.id === player.nowPlayingMessageId;

    switch (action) {
      case 'toggle':
      case 'loop': {
        if (action === 'loop') player.setLoop(LOOP_CYCLE[player.queue.loop]);
        else if (player.isPaused) player.resume();
        else player.pause();
        await interaction.update(player.nowPlayingPayload({ withProgress: !isMainMessage }));
        if (!isMainMessage) void player.refreshNowPlaying();
        break;
      }
      case 'skip': {
        await interaction.deferUpdate();
        const skipped = await player.skip();
        if (skipped) await interaction.followUp({ embeds: [successEmbed(`⏭️ ${interaction.member} pulou ${trackLink(skipped)}.`)] });
        break;
      }
      case 'stop': {
        await interaction.deferUpdate();
        await player.stop();
        await interaction.followUp({ embeds: [successEmbed(`⏹️ ${interaction.member} parou a música e limpou a fila.`)] });
        break;
      }
    }
  } catch (error) {
    await handleError(interaction, ctx, error, `botão ${action}`);
  }
}

export function registerInteractionHandler(client: Client, ctx: BotContext): void {
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.inCachedGuild()) {
      if (interaction.isRepliable()) {
        await interaction
          .reply({ content: 'Meus comandos funcionam apenas dentro de servidores.', flags: MessageFlags.Ephemeral })
          .catch(() => {});
      }
      return;
    }

    if (interaction.isChatInputCommand()) await handleCommand(interaction, ctx);
    else if (interaction.isAutocomplete()) await handleAutocomplete(interaction, ctx);
    else if (interaction.isButton() && interaction.customId.startsWith(PLAYER_BUTTON_PREFIX)) {
      await handlePlayerButton(interaction, ctx);
    }
    // Demais componentes (paginação da fila, menu do /search) são tratados por coletores nos próprios comandos.
  });
}
