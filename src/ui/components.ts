import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import type { LoopMode } from '../music/Queue.js';

/** Prefixo dos botões do "Tocando agora"; tratados globalmente em events/interactionCreate. */
export const PLAYER_BUTTON_PREFIX = 'player:';

export type PlayerButtonAction = 'toggle' | 'skip' | 'stop' | 'loop' | 'queue';

/** Emojis personalizados do app (Developer Portal > Emojis). Só o app pode usá-los, em qualquer servidor. */
export const EMOJI = {
  play: { name: 'tocar', id: '1555078479480102934' },
  pause: { name: 'pausar', id: '1555078474614571128' },
  skip: { name: 'pular', id: '1555078475814150204' },
  stop: { name: 'parar', id: '1555078472991375484' },
  loop: { name: 'repetir', id: '1555078477529485332' },
  queue: { name: 'fila', id: '1555078472253055027' },
} as const;

export function playerControls(state: { paused: boolean; loop: LoopMode }): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${PLAYER_BUTTON_PREFIX}toggle`)
      .setEmoji(state.paused ? EMOJI.play : EMOJI.pause)
      .setLabel(state.paused ? 'Retomar' : 'Pausar')
      .setStyle(state.paused ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`${PLAYER_BUTTON_PREFIX}skip`).setEmoji(EMOJI.skip).setLabel('Pular').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`${PLAYER_BUTTON_PREFIX}stop`).setEmoji(EMOJI.stop).setLabel('Parar').setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`${PLAYER_BUTTON_PREFIX}loop`)
      .setEmoji(EMOJI.loop)
      .setLabel(state.loop === 'off' ? 'Loop' : state.loop === 'track' ? 'Loop: música' : 'Loop: fila')
      .setStyle(state.loop === 'off' ? ButtonStyle.Secondary : ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`${PLAYER_BUTTON_PREFIX}queue`).setEmoji(EMOJI.queue).setLabel('Fila').setStyle(ButtonStyle.Secondary),
  );
}

export function pageButtons(page: number, totalPages: number, prefix: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${prefix}:prev`)
      .setEmoji('◀️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 1),
    new ButtonBuilder()
      .setCustomId(`${prefix}:page`)
      .setLabel(`${page}/${totalPages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`${prefix}:next`)
      .setEmoji('▶️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages),
  );
}

export const LOOP_CYCLE: Record<LoopMode, LoopMode> = { off: 'queue', queue: 'track', track: 'off' };
