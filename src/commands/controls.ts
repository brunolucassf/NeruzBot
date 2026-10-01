import { UserError } from '../core/errors.js';
import type { Command } from '../core/types.js';
import { LOOP_LABELS, type LoopMode } from '../music/Queue.js';
import { LOOP_CYCLE } from '../ui/components.js';
import { successEmbed, trackLink } from '../ui/embeds.js';
import { formatDuration, parseTimestamp } from '../utils/format.js';
import { requireControllablePlayer } from '../utils/voice.js';
import { guildCommand } from './shared.js';

export const pause: Command = {
  category: 'Controle',
  data: guildCommand('pause', 'Pausa a música atual'),
  async execute(interaction, ctx) {
    const player = requireControllablePlayer(interaction.member, ctx.players);
    if (player.isPaused) throw new UserError('A música já está pausada. Use `/resume` para continuar.');
    if (!player.pause()) throw new UserError('Não consegui pausar agora (a música ainda está carregando).');
    void player.refreshNowPlaying();
    await interaction.reply({ embeds: [successEmbed('⏸️ Música pausada. Use `/resume` para continuar.')] });
  },
};

export const resume: Command = {
  category: 'Controle',
  data: guildCommand('resume', 'Continua a música pausada'),
  async execute(interaction, ctx) {
    const player = requireControllablePlayer(interaction.member, ctx.players);
    if (!player.isPaused) throw new UserError('A música não está pausada.');
    player.resume();
    void player.refreshNowPlaying();
    await interaction.reply({ embeds: [successEmbed('▶️ Música retomada.')] });
  },
};

export const skip: Command = {
  category: 'Controle',
  data: guildCommand('skip', 'Pula para a próxima música da fila'),
  async execute(interaction, ctx) {
    const player = requireControllablePlayer(interaction.member, ctx.players, { requireTrack: false });
    if (!player.currentTrack && player.queue.isEmpty) throw new UserError('Não há nada para pular.');
    await interaction.deferReply();
    const skipped = await player.skip();
    await interaction.editReply({
      embeds: [successEmbed(skipped ? `⏭️ Pulei ${trackLink(skipped)}.` : '⏭️ Tocando a próxima da fila.')],
    });
  },
};

export const skipTo: Command = {
  category: 'Controle',
  data: guildCommand('skipto', 'Pula direto para uma música da fila').addIntegerOption((option) =>
    option.setName('posicao').setDescription('Posição na fila (veja em /queue)').setRequired(true).setMinValue(1),
  ),
  async execute(interaction, ctx) {
    const player = requireControllablePlayer(interaction.member, ctx.players, { requireTrack: false });
    const position = interaction.options.getInteger('posicao', true);
    if (position > player.queue.size) throw new UserError(`A fila tem só ${player.queue.size} música(s). Veja com \`/queue\`.`);
    await interaction.deferReply();
    const track = await player.skipTo(position);
    await interaction.editReply({ embeds: [successEmbed(`⏭️ Pulando para ${trackLink(track)}.`)] });
  },
};

export const previous: Command = {
  category: 'Controle',
  data: guildCommand('previous', 'Volta para a música anterior'),
  async execute(interaction, ctx) {
    const player = requireControllablePlayer(interaction.member, ctx.players, { requireTrack: false });
    if (!player.queue.hasHistory) throw new UserError('Não há música anterior.');
    await interaction.deferReply();
    const track = await player.previous();
    await interaction.editReply({ embeds: [successEmbed(`⏮️ Voltando para ${trackLink(track)}.`)] });
  },
};

function relativeSeek(name: 'forward' | 'rewind', description: string, sign: 1 | -1): Command {
  return {
    category: 'Controle',
    data: guildCommand(name, description).addIntegerOption((option) =>
      option.setName('segundos').setDescription('Quantos segundos (padrão: 10)').setMinValue(1).setMaxValue(3600),
    ),
    async execute(interaction, ctx) {
      const player = requireControllablePlayer(interaction.member, ctx.players);
      const seconds = interaction.options.getInteger('segundos') ?? 10;
      const target = Math.max(0, player.positionMs + sign * seconds * 1000);
      await interaction.deferReply();
      await player.seek(target);
      const icon = sign > 0 ? '⏩' : '⏪';
      await interaction.editReply({ embeds: [successEmbed(`${icon} ${sign > 0 ? 'Avancei' : 'Voltei'} ${seconds}s, agora em \`${formatDuration(target)}\`.`)] });
    },
  };
}

export const forward = relativeSeek('forward', 'Avança alguns segundos na música (padrão: 10)', 1);
export const rewind = relativeSeek('rewind', 'Volta alguns segundos na música (padrão: 10)', -1);

export const seek: Command = {
  category: 'Controle',
  data: guildCommand('seek', 'Vai para um ponto da música (ex.: 1:30, 90, 2m15s)').addStringOption((option) =>
    option.setName('tempo').setDescription('Ponto da música: 1:30, 90 (segundos) ou 2m15s').setRequired(true).setMaxLength(12),
  ),
  async execute(interaction, ctx) {
    const player = requireControllablePlayer(interaction.member, ctx.players);
    const positionMs = parseTimestamp(interaction.options.getString('tempo', true));
    if (positionMs === null) throw new UserError('Formato de tempo inválido. Exemplos: `1:30`, `90` ou `2m15s`.');
    await interaction.deferReply();
    await player.seek(positionMs);
    await interaction.editReply({ embeds: [successEmbed(`⏩ Pulei para \`${formatDuration(positionMs)}\`.`)] });
  },
};

export const stop: Command = {
  category: 'Controle',
  data: guildCommand('stop', 'Para a música e limpa a fila'),
  async execute(interaction, ctx) {
    const player = requireControllablePlayer(interaction.member, ctx.players, { requireTrack: false });
    await interaction.deferReply();
    await player.stop();
    await interaction.editReply({ embeds: [successEmbed('⏹️ Parei a música e limpei a fila.')] });
  },
};

export const leave: Command = {
  category: 'Controle',
  data: guildCommand('leave', 'Faz o bot sair do canal de voz'),
  async execute(interaction, ctx) {
    const player = requireControllablePlayer(interaction.member, ctx.players, { requireTrack: false });
    player.destroy();
    await interaction.reply({ embeds: [successEmbed('👋 Saí do canal de voz.')] });
  },
};

export const volume: Command = {
  category: 'Controle',
  data: guildCommand('volume', 'Mostra ou altera o volume (0 a 200%)').addIntegerOption((option) =>
    option.setName('valor').setDescription('Novo volume em %, de 0 a 200').setMinValue(0).setMaxValue(200),
  ),
  async execute(interaction, ctx) {
    const player = requireControllablePlayer(interaction.member, ctx.players, { requireTrack: false });
    const value = interaction.options.getInteger('valor');
    if (value === null) {
      await interaction.reply({ embeds: [successEmbed(`🔊 Volume atual: **${player.volume}%**`)] });
      return;
    }
    player.setVolume(value);
    void player.refreshNowPlaying();
    const icon = value === 0 ? '🔇' : value < 50 ? '🔈' : value <= 100 ? '🔉' : '🔊';
    await interaction.reply({ embeds: [successEmbed(`${icon} Volume ajustado para **${value}%**.`)] });
  },
};

export const loop: Command = {
  category: 'Controle',
  data: guildCommand('loop', 'Repete a música atual ou a fila inteira').addStringOption((option) =>
    option
      .setName('modo')
      .setDescription('Se não informar, alterna entre os modos')
      .addChoices(
        { name: 'Desativado', value: 'off' },
        { name: 'Música atual', value: 'track' },
        { name: 'Fila inteira', value: 'queue' },
      ),
  ),
  async execute(interaction, ctx) {
    const player = requireControllablePlayer(interaction.member, ctx.players, { requireTrack: false });
    const mode = (interaction.options.getString('modo') as LoopMode | null) ?? LOOP_CYCLE[player.queue.loop];
    player.setLoop(mode);
    void player.refreshNowPlaying();
    const icon = mode === 'track' ? '🔂' : '🔁';
    await interaction.reply({ embeds: [successEmbed(`${icon} Loop: **${LOOP_LABELS[mode]}**.`)] });
  },
};
