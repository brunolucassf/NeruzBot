import {
  ApplicationIntegrationType,
  InteractionContextType,
  Locale,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type EmbedBuilder,
  type GuildMember,
  type SendableChannels,
  type VoiceBasedChannel,
} from 'discord.js';
import { UserError } from '../core/errors.js';
import type { BotContext } from '../core/types.js';
import type { Requester } from '../music/Track.js';
import type { ResolvedQuery } from '../music/TrackResolver.js';
import { addedToQueueEmbed } from '../ui/embeds.js';
import { resolveTargetChannel } from '../utils/voice.js';
import { PT_NAMES } from './names.js';

/** Comando de barra disponível só dentro de servidores (voz não existe em DM). */
export function guildCommand(name: string, description: string): SlashCommandBuilder {
  const pt = PT_NAMES[name];
  return new SlashCommandBuilder()
    .setName(name)
    .setNameLocalizations(pt && pt !== name ? { [Locale.PortugueseBR]: pt } : {})
    .setDescription(description)
    .setContexts(InteractionContextType.Guild)
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall);
}

export function requesterOf(member: GuildMember): Requester {
  return { id: member.id, name: member.displayName };
}

/** Entra no canal (se preciso), coloca as faixas na fila e devolve o embed de confirmação. */
export async function joinAndEnqueue(
  ctx: BotContext,
  params: {
    channel: VoiceBasedChannel;
    textChannel: SendableChannels | null;
    result: ResolvedQuery;
    next: boolean;
  },
): Promise<EmbedBuilder> {
  const player = ctx.players.getOrCreate(params.channel.guild);
  if (params.textChannel) player.textChannel = params.textChannel;
  await player.connect(params.channel);

  const outcome = player.enqueue(params.result.tracks, { next: params.next });
  if (outcome.added.length === 0) {
    throw new UserError(`A fila está cheia (máximo de ${ctx.config.MAX_QUEUE_SIZE} músicas).`);
  }
  return addedToQueueEmbed({
    tracks: outcome.added,
    dropped: outcome.dropped,
    position: outcome.position,
    etaMs: player.estimateWaitMs(outcome.position),
    playingNow: outcome.startsPlaying,
    playlist: params.result.playlist,
  });
}

/**
 * Fluxo padrão dos comandos que tocam algo: valida o canal ANTES de responder (erros saem só para
 * o usuário), responde "pensando..." (o Discord exige resposta em 3 s) e então carrega e enfileira.
 */
export async function playFlow(
  interaction: ChatInputCommandInteraction<'cached'>,
  ctx: BotContext,
  options: { next: boolean; load: (requester: Requester) => Promise<ResolvedQuery> },
): Promise<void> {
  const channel = resolveTargetChannel(interaction.member, ctx.players.get(interaction.guildId));
  await interaction.deferReply();
  const result = await options.load(requesterOf(interaction.member));
  const textChannel = interaction.channel?.isSendable() ? interaction.channel : null;
  const embed = await joinAndEnqueue(ctx, { channel, textChannel, result, next: options.next });
  await interaction.editReply({ embeds: [embed] });
}
