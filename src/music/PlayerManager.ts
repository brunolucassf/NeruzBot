import type { Guild } from 'discord.js';
import { GuildPlayer, type PlayerDeps } from './GuildPlayer.js';

/** Mantém um GuildPlayer por servidor. */
export class PlayerManager {
  private readonly players = new Map<string, GuildPlayer>();

  constructor(private readonly deps: PlayerDeps) {}

  get size(): number {
    return this.players.size;
  }

  get(guildId: string): GuildPlayer | undefined {
    return this.players.get(guildId);
  }

  getOrCreate(guild: Guild): GuildPlayer {
    let player = this.players.get(guild.id);
    if (!player) {
      player = new GuildPlayer(guild, this.deps, (destroyed) => {
        if (this.players.get(destroyed.guild.id) === destroyed) this.players.delete(destroyed.guild.id);
      });
      this.players.set(guild.id, player);
    }
    return player;
  }

  destroyAll(): void {
    for (const player of [...this.players.values()]) player.destroy();
  }
}
