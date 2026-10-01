import { Events, type Client } from 'discord.js';
import type { BotContext } from '../core/types.js';

/** Detecta quando o canal do bot fica vazio (ou volta a ter gente) para pausar/sair automaticamente. */
export function registerVoiceStateHandler(client: Client, ctx: BotContext): void {
  client.on(Events.VoiceStateUpdate, (oldState, newState) => {
    const player = ctx.players.get(newState.guild.id);
    const channelId = player?.voiceChannelId;
    if (!player || !channelId) return;

    const involvesBotChannel = oldState.channelId === channelId || newState.channelId === channelId;
    const isBotItself = newState.id === client.user?.id;
    if (involvesBotChannel || isBotItself) player.checkListeners();
  });
}
