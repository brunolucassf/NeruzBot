import { describe, expect, it } from 'vitest';
import { UserError } from '../src/core/errors.js';
import { PREFIX_SPECS, findPrefixSpec, parsePrefixMessage } from '../src/prefix/registry.js';

const message = (attachments: unknown[] = []) => ({ attachments: { first: () => attachments[0] } }) as never;

describe('parsePrefixMessage', () => {
  it.each([
    ['n!play despacito', '!', 'play', 'despacito'],
    ['N!PAUSE', '!', 'pause', ''],
    ['n.tocar  henrique e juliano ', '.', 'tocar', 'henrique e juliano'],
    ['n!fila 2', '!', 'fila', '2'],
    ['n!tocar https://youtu.be/dQw4w9WgXcQ', '!', 'tocar', 'https://youtu.be/dQw4w9WgXcQ'],
  ])('%s', (input, kind, name, args) => {
    expect(parsePrefixMessage(input)).toEqual({ kind, name, args });
  });

  it.each(['oi', 'n! play', 'n.', 'n!', 'mano n!play', '.p', 'n!123', 'nada! play'])('ignora "%s"', (input) => {
    expect(parsePrefixMessage(input)).toBeNull();
  });
});

describe('registro de comandos', () => {
  it('todo comando existe em inglês e português, sem nomes repetidos', () => {
    const all = PREFIX_SPECS.flatMap((spec) => spec.names);
    expect(new Set(all).size).toBe(all.length);
    for (const spec of PREFIX_SPECS) expect(spec.names.length).toBeGreaterThanOrEqual(2);
  });

  it('os nomes pedidos existem', () => {
    for (const name of ['trocar', 'pausar', 'pular', 'fila', 'playlist', 'tocar', 'next', 'pause']) {
      expect(findPrefixSpec(name), name).toBeDefined();
    }
  });

  it('pausar alterna entre pausar e continuar', () => {
    const slash = findPrefixSpec('pausar')!.slash as (s: { isPaused: boolean }) => string;
    expect(slash({ isPaused: false })).toBe('pause');
    expect(slash({ isPaused: true })).toBe('resume');
  });

  it('trocar, next e pular são a mesma ação', () => {
    expect(findPrefixSpec('trocar')).toBe(findPrefixSpec('next'));
    expect(findPrefixSpec('pular')).toBe(findPrefixSpec('skip'));
  });
});

describe('conversão de argumentos', () => {
  const run = (name: string, args: string, msg = message()) => findPrefixSpec(name)!.parse(args, msg);

  it('play e playnext', () => {
    expect(run('tocar', 'despacito')).toEqual({ busca: 'despacito', proxima: false });
    expect(run('tocarja', 'despacito')).toEqual({ busca: 'despacito', proxima: true });
    expect(() => run('tocar', '')).toThrow(UserError);
  });

  it('números, com erro amigável', () => {
    expect(run('pularpara', '3')).toEqual({ posicao: 3 });
    expect(run('mover', '5 1')).toEqual({ de: 5, para: 1 });
    expect(run('volume', '')).toEqual({ valor: undefined });
    expect(run('avancar', '30')).toEqual({ segundos: 30 });
    expect(() => run('remover', 'abc')).toThrow(/não é um número/);
    expect(() => run('mover', '5')).toThrow(UserError);
  });

  it('loop aceita palavras em português e inglês', () => {
    expect(run('repetir', 'fila')).toEqual({ modo: 'queue' });
    expect(run('loop', 'musica')).toEqual({ modo: 'track' });
    expect(run('loop', 'off')).toEqual({ modo: 'off' });
    expect(run('loop', '')).toEqual({});
    expect(() => run('loop', 'banana')).toThrow(UserError);
  });

  it('arquivo exige anexo', () => {
    expect(() => run('arquivo', '')).toThrow(/Anexe/);
    const file = { url: 'x' };
    expect(run('arquivo', '', message([file]))).toMatchObject({ arquivo: file });
  });
});
