import { PermissionFlagsBits, ChannelType, type Guild, type GuildMember, type VoiceBasedChannel } from 'discord.js';
import { UserError } from '../core/errors.js';
import type { GuildPlayer } from '../music/GuildPlayer.js';
import type { PlayerManager } from '../music/PlayerManager.js';

/** Pessoas (não bots) conectadas ao canal. Membros fora do cache contam como pessoas, por segurança. */
export function countListeners(guild: Guild, channelId: string): number {
  const botId = guild.members.me?.id;
  return guild.voiceStates.cache.filter(
    (state) => state.channelId === channelId && state.id !== botId && !state.member?.user.bot,
  ).size;
}

export function requireVoiceChannel(member: GuildMember): VoiceBasedChannel {
  const channel = member.voice.channel;
  if (!channel) throw new UserError('Você precisa entrar em um canal de voz primeiro.');
  return channel;
}

export function assertCanJoin(channel: VoiceBasedChannel): void {
  const me = channel.guild.members.me;
  const permissions = me ? channel.permissionsFor(me) : null;
  if (!me || !permissions) throw new UserError('Não consegui verificar minhas permissões nesse canal.');

  const required: [bigint, string][] = [
    [PermissionFlagsBits.ViewChannel, 'Ver canal'],
    [PermissionFlagsBits.Connect, 'Conectar'],
  ];
  // Em palcos o bot entra como ouvinte e pede para falar; nos demais canais precisa de "Falar".
  if (channel.type !== ChannelType.GuildStageVoice) required.push([PermissionFlagsBits.Speak, 'Falar']);

  const missing = required.filter(([flag]) => !permissions.has(flag)).map(([, label]) => label);
  if (missing.length > 0) {
    throw new UserError(`Preciso das permissões **${missing.join(', ')}** no canal ${channel}.`);
  }
  if (me.voice.channelId !== channel.id && channel.full && !permissions.has(PermissionFlagsBits.MoveMembers)) {
    throw new UserError(`O canal ${channel} está cheio.`);
  }
}

/**
 * Para comandos que colocam música: decide o canal de voz e valida se o bot pode ir até lá.
 * Se o bot já está tocando para outras pessoas em outro canal, não "sequestra" o bot.
 */
export function resolveTargetChannel(member: GuildMember, player: GuildPlayer | undefined): VoiceBasedChannel {
  const channel = requireVoiceChannel(member);
  const botChannelId = player?.voiceChannelId;
  if (botChannelId && botChannelId !== channel.id) {
    const busy = Boolean(player.currentTrack) || countListeners(member.guild, botChannelId) > 0;
    if (busy) throw new UserError(`Já estou tocando em <#${botChannelId}>. Entre nesse canal para pedir músicas.`);
  }
  assertCanJoin(channel);
  return channel;
}

/** Para comandos de controle (pular, pausar...): exige player ativo e o usuário no mesmo canal. */
export function requireControllablePlayer(
  member: GuildMember,
  players: PlayerManager,
  options: { requireTrack?: boolean } = {},
): GuildPlayer {
  const player = players.get(member.guild.id);
  const channelId = player?.voiceChannelId;
  if (!player || !channelId) throw new UserError('Não estou conectado a nenhum canal de voz.');
  if (member.voice.channelId !== channelId) {
    throw new UserError(`Você precisa estar no mesmo canal de voz que eu (<#${channelId}>).`);
  }
  if ((options.requireTrack ?? true) && !player.currentTrack) throw new UserError('Não há nada tocando agora.');
  return player;
}
