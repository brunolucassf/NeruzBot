import { describe, expect, it } from 'vitest';
import { UserError } from '../src/core/errors.js';
import { Queue } from '../src/music/Queue.js';
import { createTrack, type Track } from '../src/music/Track.js';

const requester = { id: '1', name: 'Teste' };
const track = (title: string, durationMs = 1000): Track =>
  createTrack({ title, url: `https://example.com/${title}`, durationMs, source: 'youtube', requester, playbackUrl: title });

function queueWith(...titles: string[]): Queue {
  const queue = new Queue();
  queue.add(titles.map((title) => track(title)));
  return queue;
}

const titles = (queue: Queue) => queue.tracks.map((t) => t.title);

describe('Queue', () => {
  it('avança na ordem e termina com null', () => {
    const queue = queueWith('a', 'b');
    expect(queue.next()?.title).toBe('a');
    expect(queue.next()?.title).toBe('b');
    expect(queue.next()).toBeNull();
    expect(queue.current).toBeNull();
  });

  it('adiciona no início com next: true', () => {
    const queue = queueWith('a', 'b');
    queue.add([track('x')], { next: true });
    expect(titles(queue)).toEqual(['x', 'a', 'b']);
  });

  it('loop de faixa repete a atual, mas force pula', () => {
    const queue = queueWith('a', 'b');
    queue.loop = 'track';
    queue.next();
    expect(queue.next()?.title).toBe('a');
    expect(queue.next({ force: true })?.title).toBe('b');
  });

  it('loop de fila devolve a faixa atual para o fim', () => {
    const queue = queueWith('a', 'b');
    queue.loop = 'queue';
    const order = Array.from({ length: 5 }, () => queue.next()?.title);
    expect(order).toEqual(['a', 'b', 'a', 'b', 'a']);
  });

  it('dropCurrent impede que a faixa volte com loop de fila', () => {
    const queue = queueWith('a', 'b');
    queue.loop = 'queue';
    queue.next();
    queue.dropCurrent();
    expect(queue.next()?.title).toBe('b');
    expect(queue.next()?.title).toBe('b');
  });

  it('skipTo descarta as anteriores e torna a escolhida atual', () => {
    const queue = queueWith('a', 'b', 'c', 'd');
    queue.next();
    expect(queue.skipTo(2).title).toBe('c');
    expect(titles(queue)).toEqual(['d']);
  });

  it('skipTo com loop de fila preserva a ordem circular', () => {
    const queue = queueWith('a', 'b', 'c', 'd');
    queue.loop = 'queue';
    queue.next(); // tocando a
    expect(queue.skipTo(2).title).toBe('c');
    expect(titles(queue)).toEqual(['d', 'a', 'b']);
  });

  it('remove e move usam posições 1-based', () => {
    const queue = queueWith('a', 'b', 'c', 'd');
    expect(queue.remove(2).title).toBe('b');
    expect(titles(queue)).toEqual(['a', 'c', 'd']);
    queue.move(3, 1);
    expect(titles(queue)).toEqual(['d', 'a', 'c']);
  });

  it('rejeita posições inválidas com mensagem para o usuário', () => {
    const queue = queueWith('a');
    expect(() => queue.remove(0)).toThrow(UserError);
    expect(() => queue.remove(2)).toThrow(UserError);
    expect(() => queue.move(1, 5)).toThrow(UserError);
  });

  it('shuffle mantém as mesmas faixas', () => {
    const queue = queueWith('a', 'b', 'c', 'd', 'e');
    let seed = 0.42;
    queue.shuffle(() => (seed = (seed * 9301 + 49297) % 233280 / 233280));
    expect([...titles(queue)].sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('calcula a duração das próximas e limpa', () => {
    const queue = new Queue();
    queue.add([track('a', 60_000), track('b', 30_000)]);
    expect(queue.upcomingDurationMs).toBe(90_000);
    expect(queue.clear()).toBe(2);
    expect(queue.isEmpty).toBe(true);
  });
});

describe('Queue: voltar', () => {
  it('volta para a anterior e a atual vira a próxima', () => {
    const queue = queueWith('a', 'b', 'c');
    queue.next(); // a
    queue.next(); // b
    expect(queue.previous()?.title).toBe('a');
    expect(queue.current?.title).toBe('a');
    expect(titles(queue)).toEqual(['b', 'c']);
  });

  it('retorna null sem histórico e depois de parar', () => {
    const queue = queueWith('a', 'b');
    queue.next();
    expect(queue.previous()).toBeNull();
    queue.next();
    queue.reset();
    expect(queue.hasHistory).toBe(false);
  });

  it('volta para a última música depois que a fila acabou', () => {
    const queue = queueWith('a');
    queue.next();
    queue.next(); // fila acabou
    expect(queue.current).toBeNull();
    expect(queue.previous()?.title).toBe('a');
  });
});
