import { EmbedBuilder, escapeMarkdown } from 'discord.js';
import { LOOP_LABELS, type LoopMode } from '../music/Queue.js';
import { SOURCE_LABELS, type Track } from '../music/Track.js';
import { escapeLinkText, formatDuration, pluralize, progressBar, truncate } from '../utils/format.js';

export const COLORS = {
  brand: 0x7c3aed,
  success: 0x22c55e,
  warning: 0xf59e0b,
  error: 0xef4444,
} as const;

/** Estado do player necessário para desenhar os embeds (evita acoplar a UI ao GuildPlayer). */
export interface PlayerSnapshot {
  current: Track | null;
  upcoming: readonly Track[];
  upcomingDurationMs: number;
  positionMs: number;
  volume: number;
  loop: LoopMode;
  paused: boolean;
}

export const QUEUE_PAGE_SIZE = 10;

export function trackLink(track: Track, max = 70): string {
  return `[${escapeLinkText(escapeMarkdown(truncate(track.title, max)))}](${track.url})`;
}

function trackDuration(track: Track): string {
  return track.isLive ? '🔴 Ao vivo' : formatDuration(track.durationMs);
}

export function errorEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder().setColor(COLORS.error).setDescription(`❌ ${message}`);
}

export function successEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder().setColor(COLORS.success).setDescription(message);
}

export function infoEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder().setColor(COLORS.brand).setDescription(message);
}

export function nowPlayingEmbed(state: PlayerSnapshot, options: { withProgress?: boolean } = {}): EmbedBuilder {
  const track = state.current;
  if (!track) return infoEmbed('Nada tocando no momento.');

  const lines: string[] = [];
  if (track.author) lines.push(`por **${escapeMarkdown(track.author)}**`);
  if (options.withProgress) {
    const position = formatDuration(state.positionMs);
    lines.push(
      '',
      track.isLive
        ? `🔴 AO VIVO • ${position}`
        : track.durationMs
          ? `${progressBar(state.positionMs, track.durationMs)}\n\`${position} / ${formatDuration(track.durationMs)}\``
          : `\`${position} / --:--\``,
    );
  }

  const embed = new EmbedBuilder()
    .setColor(COLORS.brand)
    .setAuthor({ name: state.paused ? '⏸️ Pausado' : '🎶 Tocando agora' })
    .setTitle(truncate(track.title, 256))
    .setURL(track.url)
    .addFields(
      { name: 'Duração', value: trackDuration(track), inline: true },
      { name: 'Pedido por', value: `<@${track.requester.id}>`, inline: true },
      { name: 'Fonte', value: SOURCE_LABELS[track.source], inline: true },
    )
    .setFooter({
      text: `Volume ${state.volume}% • Loop: ${LOOP_LABELS[state.loop]} • ${pluralize(state.upcoming.length, 'música')} na fila`,
    });
  if (lines.length > 0) embed.setDescription(lines.join('\n'));
  if (track.thumbnail) embed.setThumbnail(track.thumbnail);
  return embed;
}

export function queueEmbed(state: PlayerSnapshot, page: number): EmbedBuilder {
  const totalPages = Math.max(1, Math.ceil(state.upcoming.length / QUEUE_PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * QUEUE_PAGE_SIZE;

  const lines: string[] = [];
  if (state.current) {
    lines.push(
      `**${state.paused ? '⏸️ Pausado' : '🎶 Tocando agora'}:** ${trackLink(state.current)} \`${trackDuration(state.current)}\``,
      '',
    );
  }
  if (state.upcoming.length === 0) {
    lines.push('A fila está vazia. Use `/play` para adicionar músicas.');
  } else {
    lines.push('**Próximas:**');
    state.upcoming.slice(start, start + QUEUE_PAGE_SIZE).forEach((track, offset) => {
      lines.push(`\`${start + offset + 1}.\` ${trackLink(track, 55)} \`${trackDuration(track)}\` • <@${track.requester.id}>`);
    });
  }

  const remaining = state.current?.durationMs ? Math.max(state.current.durationMs - state.positionMs, 0) : 0;
  return new EmbedBuilder()
    .setColor(COLORS.brand)
    .setTitle('📜 Fila de reprodução')
    .setDescription(lines.join('\n'))
    .setFooter({
      text: `Página ${safePage}/${totalPages} • ${pluralize(state.upcoming.length, 'música')} • Tempo total: ${formatDuration(
        state.upcomingDurationMs + remaining,
      )} • Loop: ${LOOP_LABELS[state.loop]}`,
    });
}

export function addedToQueueEmbed(params: {
  tracks: readonly Track[];
  dropped: number;
  position: number;
  etaMs?: number;
  playingNow: boolean;
  playlist?: { title: string; url: string; thumbnail?: string; totalTracks: number };
}): EmbedBuilder {
  const { tracks, dropped, playlist } = params;
  const embed = new EmbedBuilder().setColor(COLORS.success);

  if (playlist) {
    const totalMs = tracks.reduce((sum, track) => sum + (track.durationMs ?? 0), 0);
    embed
      .setAuthor({ name: '📚 Playlist adicionada à fila' })
      .setTitle(truncate(playlist.title, 256))
      .setURL(playlist.url)
      .setDescription(
        [
          `**${pluralize(tracks.length, 'música')}** adicionada${tracks.length === 1 ? '' : 's'}` +
            (totalMs ? ` • duração total ${formatDuration(totalMs)}` : ''),
          playlist.totalTracks > tracks.length + dropped
            ? `-# A playlist tem ${playlist.totalTracks} músicas; o limite por playlist é de ${tracks.length + dropped}.`
            : '',
          dropped > 0 ? `-# ${pluralize(dropped, 'música')} não coube${dropped === 1 ? '' : 'ram'} na fila (limite atingido).` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      );
    if (playlist.thumbnail) embed.setThumbnail(playlist.thumbnail);
    return embed;
  }

  const track = tracks[0]!;
  embed
    .setAuthor({ name: params.playingNow ? '▶️ Tocando agora' : '➕ Adicionada à fila' })
    .setTitle(truncate(track.title, 256))
    .setURL(track.url)
    .addFields({ name: 'Duração', value: trackDuration(track), inline: true });
  if (!params.playingNow) {
    embed.addFields({ name: 'Posição', value: `#${params.position}`, inline: true });
    if (params.etaMs) embed.addFields({ name: 'Toca em', value: `~${formatDuration(params.etaMs)}`, inline: true });
  }
  if (track.author) embed.setDescription(`por **${escapeMarkdown(track.author)}**`);
  if (track.thumbnail) embed.setThumbnail(track.thumbnail);
  return embed;
}
