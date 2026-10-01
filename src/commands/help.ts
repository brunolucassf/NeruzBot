import { EmbedBuilder, MessageFlags } from 'discord.js';
import type { Command, CommandCategory } from '../core/types.js';
import { PREFIX_SPECS } from '../prefix/registry.js';
import { COLORS } from '../ui/embeds.js';
import { guildCommand } from './shared.js';

const CATEGORY_TITLES: Record<CommandCategory, string> = {
  Tocar: '▶️ Tocar',
  Controle: '🎛️ Controle',
  Fila: '📜 Fila',
  Geral: 'ℹ️ Geral',
};

export const help: Command = {
  category: 'Geral',
  data: guildCommand('help', 'Mostra todos os comandos e o que o Neruz consegue tocar'),
  async execute(interaction, ctx) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.brand)
      .setTitle('🎵 Neruz Bot: comandos')
      .setDescription(
        [
          'Use **`n!`** ou **`n.`** antes do comando (ex.: `n!tocar nome da música`) ou os comandos de barra (`/`).',
          'Cada comando funciona em português e em inglês.',
          '',
          '**O que posso tocar:** YouTube e YouTube Music (vídeos, lives e playlists), Spotify (música, álbum, playlist e artista), SoundCloud, links diretos de áudio e arquivos enviados.',
        ].join('\n'),
      );

    for (const category of Object.keys(CATEGORY_TITLES) as CommandCategory[]) {
      const lines = PREFIX_SPECS.filter((spec) => spec.category === category).map((spec) => {
        const slash = ctx.commands.get(spec.id);
        const description = spec.description ?? slash?.data.toJSON().description ?? '';
        const names = spec.names.map((name) => `\`n!${name}\``).join(' · ');
        const usage = spec.usage ? ` \`${spec.usage}\`` : '';
        return `${names}${usage}\n-# ${description}`;
      });
      if (lines.length > 0) embed.addFields({ name: CATEGORY_TITLES[category], value: lines.join('\n').slice(0, 1024) });
    }
    embed.setFooter({ text: 'Para controlar a música, entre no mesmo canal de voz que eu.' });
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
