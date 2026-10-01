import {
  ActionRowBuilder,
  ComponentType,
  DiscordjsErrorCodes,
  MessageFlags,
  StringSelectMenuBuilder,
  type MessageComponentInteraction,
} from 'discord.js';
import { UserError } from '../core/errors.js';
import type { Command } from '../core/types.js';
import { fetchYouTubeSuggestions } from '../services/suggestions.js';
import { infoEmbed, trackLink } from '../ui/embeds.js';
import { formatDuration, truncate } from '../utils/format.js';
import { isDiscordCdn } from '../utils/network.js';
import { isAudioFileName } from '../utils/query.js';
import { resolveTargetChannel } from '../utils/voice.js';
import { guildCommand, joinAndEnqueue, playFlow, requesterOf } from './shared.js';

export const play: Command = {
  category: 'Tocar',
  data: guildCommand('play', 'Toca uma música ou playlist: YouTube, Spotify, SoundCloud, link direto ou busca por nome')
    .addStringOption((option) =>
      option
        .setName('busca')
        .setDescription('Nome da música ou link (YouTube, playlist, Spotify, SoundCloud...)')
        .setRequired(true)
        .setMaxLength(500)
        .setAutocomplete(true),
    )
    .addBooleanOption((option) => option.setName('proxima').setDescription('Tocar em seguida (coloca no início da fila)')),

  async execute(interaction, ctx) {
    const query = interaction.options.getString('busca', true);
    const next = interaction.options.getBoolean('proxima') ?? false;
    await playFlow(interaction, ctx, { next, load: (requester) => ctx.resolver.resolve(query, requester) });
  },

  async autocomplete(interaction) {
    const typed = interaction.options.getFocused().trim();
    // Links não recebem sugestões (e valores de sugestão têm limite de 100 caracteres).
    if (typed.length < 2 || /^(https?:\/\/|spotify:)/i.test(typed)) {
      await interaction.respond([]);
      return;
    }
    const suggestions = await fetchYouTubeSuggestions(typed);
    const unique = [typed, ...suggestions.filter((s) => s.toLowerCase() !== typed.toLowerCase())];
    await interaction.respond(unique.slice(0, 25).map((text) => ({ name: truncate(text, 100), value: truncate(text, 100) })));
  },
};

export const playFile: Command = {
  category: 'Tocar',
  data: guildCommand('playfile', 'Toca um arquivo de áudio enviado por você (mp3, ogg, wav, flac, m4a...)')
    .addAttachmentOption((option) =>
      option.setName('arquivo').setDescription('Arquivo de áudio ou vídeo').setRequired(true),
    )
    .addBooleanOption((option) => option.setName('proxima').setDescription('Tocar em seguida (coloca no início da fila)')),

  async execute(interaction, ctx) {
    const attachment = interaction.options.getAttachment('arquivo', true);
    const type = attachment.contentType ?? '';
    if (!type.startsWith('audio/') && !type.startsWith('video/') && !isAudioFileName(attachment.name)) {
      throw new UserError('Esse arquivo não parece ser de áudio. Envie mp3, ogg, wav, flac, m4a, opus ou webm.');
    }
    if (!isDiscordCdn(attachment.url)) throw new UserError('Arquivo inválido.');
    const next = interaction.options.getBoolean('proxima') ?? false;
    await playFlow(interaction, ctx, {
      next,
      load: async (requester) => ({
        tracks: [
          ctx.resolver.fromAttachment(
            { url: attachment.url, name: attachment.name, contentType: attachment.contentType, durationSeconds: attachment.duration },
            requester,
          ),
        ],
      }),
    });
  },
};

export const search: Command = {
  category: 'Tocar',
  data: guildCommand('search', 'Pesquisa no YouTube e deixa você escolher qual resultado tocar').addStringOption((option) =>
    option.setName('busca').setDescription('O que pesquisar').setRequired(true).setMaxLength(200),
  ),

  async execute(interaction, ctx) {
    const query = interaction.options.getString('busca', true);
    resolveTargetChannel(interaction.member, ctx.players.get(interaction.guildId));
    await interaction.deferReply();

    const results = await ctx.resolver.search(query, requesterOf(interaction.member), 10);
    if (results.length === 0) throw new UserError(`Não encontrei nenhum resultado para **${query}**.`);

    const menu = new StringSelectMenuBuilder()
      .setCustomId('search:select')
      .setPlaceholder('Escolha o que tocar')
      .addOptions(
        results.map((track, index) => ({
          label: truncate(`${index + 1}. ${track.title}`, 100),
          description: truncate(`${track.author ?? 'Autor desconhecido'} • ${track.isLive ? 'Ao vivo' : formatDuration(track.durationMs)}`, 100),
          value: String(index),
        })),
      );
    const list = results
      .map((track, index) => `\`${index + 1}.\` ${trackLink(track, 60)} \`${track.isLive ? 'Ao vivo' : formatDuration(track.durationMs)}\``)
      .join('\n');
    const message = await interaction.editReply({
      embeds: [infoEmbed(`🔎 **Resultados para:** ${truncate(query, 100)}\n\n${list}`).setFooter({ text: 'Você tem 60 segundos para escolher.' })],
      components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
    });

    let selection;
    try {
      selection = await message.awaitMessageComponent({
        componentType: ComponentType.StringSelect,
        time: 60_000,
        filter: async (i: MessageComponentInteraction) => {
          if (i.user.id === interaction.user.id) return true;
          await i.reply({ content: 'Só quem fez a pesquisa pode escolher. Use `/search` você também!', flags: MessageFlags.Ephemeral });
          return false;
        },
      });
    } catch (error) {
      if ((error as { code?: string }).code === DiscordjsErrorCodes.InteractionCollectorError) {
        await interaction.editReply({ embeds: [infoEmbed('⌛ Tempo esgotado. Use `/search` de novo quando quiser.')], components: [] });
        return;
      }
      throw error;
    }

    await selection.deferUpdate();
    const track = results[Number(selection.values[0])]!;
    // O usuário pode ter trocado de canal enquanto escolhia.
    const channel = resolveTargetChannel(selection.member, ctx.players.get(interaction.guildId));
    const textChannel = interaction.channel?.isSendable() ? interaction.channel : null;
    const embed = await joinAndEnqueue(ctx, { channel, textChannel, result: { tracks: [track] }, next: false });
    await interaction.editReply({ embeds: [embed], components: [] });
  },
};
