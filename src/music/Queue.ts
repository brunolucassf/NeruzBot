import { UserError } from '../core/errors.js';
import type { Track } from './Track.js';

export type LoopMode = 'off' | 'track' | 'queue';

export const LOOP_LABELS: Record<LoopMode, string> = {
  off: 'Desativado',
  track: 'Música atual',
  queue: 'Fila inteira',
};

/**
 * Fila de reprodução de um servidor. Não sabe nada de Discord nem de áudio:
 * só decide qual é a próxima faixa. As posições públicas são 1-based (como o usuário vê).
 */
export class Queue {
  current: Track | null = null;
  loop: LoopMode = 'off';
  private upcoming: Track[] = [];
  /** Últimas faixas já tocadas (a mais recente por último), para o "voltar". */
  private played: Track[] = [];

  get tracks(): readonly Track[] {
    return this.upcoming;
  }

  get size(): number {
    return this.upcoming.length;
  }

  get isEmpty(): boolean {
    return this.upcoming.length === 0;
  }

  /** Soma das durações conhecidas das próximas faixas (ms). */
  get upcomingDurationMs(): number {
    return this.upcoming.reduce((total, track) => total + (track.durationMs ?? 0), 0);
  }

  add(tracks: readonly Track[], options: { next?: boolean } = {}): void {
    if (options.next) this.upcoming.unshift(...tracks);
    else this.upcoming.push(...tracks);
  }

  /**
   * Avança para a próxima faixa e a retorna (ou `null` se a fila acabou).
   * `force` ignora o loop de faixa: usado quando o usuário pula ou quando a faixa falhou.
   */
  next(options: { force?: boolean } = {}): Track | null {
    const previous = this.current;
    if (previous && this.loop === 'track' && !options.force) return previous;
    if (previous) this.remember(previous);
    if (previous && this.loop === 'queue') this.upcoming.push(previous);
    this.current = this.upcoming.shift() ?? null;
    return this.current;
  }

  /** Volta para a faixa anterior; a atual (se houver) passa a ser a próxima. `null` se não há histórico. */
  previous(): Track | null {
    const track = this.played.pop();
    if (!track) return null;
    if (this.current) this.upcoming.unshift(this.current);
    this.current = track;
    return track;
  }

  get hasHistory(): boolean {
    return this.played.length > 0;
  }

  private remember(track: Track): void {
    this.played.push(track);
    if (this.played.length > 50) this.played.shift();
  }

  /** Descarta a faixa atual sem devolvê-la à fila (mesmo com loop da fila ligado). */
  dropCurrent(): void {
    this.current = null;
  }

  /**
   * Pula direto para a faixa em `position`, que vira a atual. As faixas puladas são descartadas
   * (ou, com loop da fila, vão para o fim junto com a faixa que estava tocando).
   */
  skipTo(position: number): Track {
    this.assertPosition(position);
    const skipped = this.upcoming.splice(0, position - 1);
    if (this.loop === 'queue') {
      if (this.current) this.upcoming.push(this.current);
      this.upcoming.push(...skipped);
    }
    this.current = this.upcoming.shift()!;
    return this.current;
  }

  remove(position: number): Track {
    this.assertPosition(position);
    return this.upcoming.splice(position - 1, 1)[0]!;
  }

  move(from: number, to: number): Track {
    this.assertPosition(from);
    this.assertPosition(to);
    const [track] = this.upcoming.splice(from - 1, 1);
    this.upcoming.splice(to - 1, 0, track!);
    return track!;
  }

  shuffle(random: () => number = Math.random): void {
    for (let i = this.upcoming.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [this.upcoming[i], this.upcoming[j]] = [this.upcoming[j]!, this.upcoming[i]!];
    }
  }

  /** Limpa as próximas faixas (a atual continua tocando). */
  clear(): number {
    const removed = this.upcoming.length;
    this.upcoming = [];
    return removed;
  }

  /** Limpa tudo, inclusive a faixa atual. */
  reset(): void {
    this.upcoming = [];
    this.current = null;
    this.played = [];
  }

  peek(): Track | undefined {
    return this.upcoming[0];
  }

  private assertPosition(position: number): void {
    if (!Number.isInteger(position) || position < 1 || position > this.upcoming.length) {
      throw new UserError(`Posição inválida: **${position}**. A fila tem ${this.upcoming.length} música(s) — veja com \`/queue\`.`);
    }
  }
}
