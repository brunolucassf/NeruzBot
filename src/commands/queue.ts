import { ComponentType, MessageFlags, type RepliableInteraction } from 'discord.js';
import { UserError } from '../core/errors.js';
import type { Command } from '../core/types.js';
import type { GuildPlayer } from '../music/GuildPlayer.js';
import { pageButtons } from '../ui/components.js';
import { QUEUE_PAGE_SIZE, queueEmbed, successEmbed, trackLink } from '../ui/embeds.js';
import { pluralize } from '../utils/format.js';
import { requireControllablePlayer } from '../utils/voice.js';
import { guildCommand } from './shared.js';

/** Mostra a fila com botões de página (usado pelo /queue e pelo botão "Fila" do player). */
export async function showQueue(
  interaction: RepliableInteraction,
  player: GuildPlayer,
  options: { page?: number; ephemeral?: boolean } = {},
): Promise<void> {
  let page = options.page ?? 1;
  const render = () => {
    const snapshot = player.snapshot();
    const totalPages = Math.max(1, Math.ceil(snapshot.upcoming.length / QUEUE_PAGE_SIZE));
    page = Math.min(Math.max(page, 1), totalPages);
    return {
      embeds: [queueEmbed(snapshot, page)],
      components: totalPages > 1 ? [pageButtons(page, totalPages, 'queue')] : [],
    };
  };

  const response = await interaction.reply({
    ...render(),
    flags: options.ephemeral ? MessageFlags.Ephemeral : undefined,
    withResponse: true,
  });
  const message = response.resource?.message;
  if (!message || player.queue.size <= QUEUE_PAGE_SIZE) return;

  const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 180_000 });
  collector.on('collect', async (button) => {
    if (button.user.id !== interaction.user.id) {
      await button.reply({ content: 'Use `/queue` para ver a fila você também.', flags: MessageFlags.Ephemeral });
      return;
    }
    page += button.customId === 'queue:next' ? 1 : -1;
    await button.update(render());
  });
  collector.on('end', () => {
    interaction.editReply({ components: [] }).catch(() => {});
  });
}

export const queue: Command = {
  category: 'Fila',
  data: guildCommand('queue', 'Mostra a fila de músicas').addIntegerOption((option) =>
    option.setName('pagina').setDescription('Página da fila').setMinValue(1),
  ),
  async execute(interaction, ctx) {
    const player = ctx.players.get(interaction.guildId);
    if (!player || (!player.currentTrack && player.queue.isEmpty)) {
      throw new UserError('A fila está vazia. Use `/play` para adicionar músicas.');
    }
    await showQueue(interaction, player, { page: interaction.options.getInteger('pagina') ?? 1 });
  },
};

export const nowPlaying: Command = {
  category: 'Fila',
  data: guildCommand('nowplaying', 'Mostra a música atual com o tempo decorrido'),
  async execute(interaction, ctx) {
    const player = ctx.players.get(interaction.guildId);
    if (!player?.currentTrack) throw new UserError('Não há nada tocando agora.');
    await interaction.reply(player.nowPlayingPayload({ withProgress: true }));
  },
};

export const shuffle: Command = {
  category: 'Fila',
  data: guildCommand('shuffle', 'Embaralha as músicas da fila'),
  async execute(interaction, ctx) {
    const player = requireControllablePlayer(interaction.member, ctx.players, { requireTrack: false });
    if (player.queue.size < 2) throw new UserError('Preciso de pelo menos 2 músicas na fila para embaralhar.');
    player.shuffle();
    await interaction.reply({ embeds: [successEmbed(`🔀 Embaralhei ${pluralize(player.queue.size, 'música')}.`)] });
  },
};

export const remove: Command = {
  category: 'Fila',
  data: guildCommand('remove', 'Remove uma música da fila').addIntegerOption((option) =>
    option.setName('posicao').setDescription('Posição na fila (veja em /queue)').setRequired(true).setMinValue(1),
  ),
  async execute(interaction, ctx) {
    const player = requireControllablePlayer(interaction.member, ctx.players, { requireTrack: false });
    const track = player.remove(interaction.options.getInteger('posicao', true));
    await interaction.reply({ embeds: [successEmbed(`🗑️ Removi ${trackLink(track)} da fila.`)] });
  },
};

export const move: Command = {
  category: 'Fila',
  data: guildCommand('move', 'Muda uma música de posição na fila')
    .addIntegerOption((option) => option.setName('de').setDescription('Posição atual').setRequired(true).setMinValue(1))
    .addIntegerOption((option) => option.setName('para').setDescription('Nova posição').setRequired(true).setMinValue(1)),
  async execute(interaction, ctx) {
    const player = requireControllablePlayer(interaction.member, ctx.players, { requireTrack: false });
    const to = interaction.options.getInteger('para', true);
    const track = player.move(interaction.options.getInteger('de', true), to);
    await interaction.reply({ embeds: [successEmbed(`↕️ Movi ${trackLink(track)} para a posição **${to}**.`)] });
  },
};

export const clear: Command = {
  category: 'Fila',
  data: guildCommand('clear', 'Remove todas as próximas músicas (a atual continua tocando)'),
  async execute(interaction, ctx) {
    const player = requireControllablePlayer(interaction.member, ctx.players, { requireTrack: false });
    const removed = player.clearQueue();
    if (removed === 0) throw new UserError('A fila já está vazia.');
    await interaction.reply({ embeds: [successEmbed(`🧹 Removi ${pluralize(removed, 'música')} da fila.`)] });
  },
};
