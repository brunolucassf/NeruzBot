import { describe, expect, it } from 'vitest';
import { escapeLinkText, formatDuration, parseTimestamp, pluralize, progressBar, truncate } from '../src/utils/format.js';

describe('formatDuration', () => {
  it('formata minutos e horas', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(83_000)).toBe('1:23');
    expect(formatDuration(3_723_000)).toBe('1:02:03');
  });
  it('trata valores desconhecidos', () => {
    expect(formatDuration(undefined)).toBe('--:--');
    expect(formatDuration(Number.NaN)).toBe('--:--');
  });
});

describe('parseTimestamp', () => {
  it.each([
    ['90', 90_000],
    ['1:30', 90_000],
    ['01:02:03', 3_723_000],
    ['2m', 120_000],
    ['1m30s', 90_000],
    ['1h2m3s', 3_723_000],
    [' 45s ', 45_000],
  ])('%s -> %i ms', (input, expected) => {
    expect(parseTimestamp(input)).toBe(expected);
  });

  it.each(['', 'abc', '1:75', '1::2', '-5'])('rejeita "%s"', (input) => {
    expect(parseTimestamp(input)).toBeNull();
  });
});

describe('utilitários de texto', () => {
  it('trunca com reticências', () => {
    expect(truncate('abcdef', 4)).toBe('abc…');
    expect(truncate('abc', 4)).toBe('abc');
  });
  it('escapa colchetes do texto de links', () => {
    expect(escapeLinkText('Música [Remix]')).toBe('Música \\[Remix\\]');
  });
  it('pluraliza', () => {
    expect(pluralize(1, 'música')).toBe('1 música');
    expect(pluralize(3, 'música')).toBe('3 músicas');
  });
  it('desenha a barra de progresso', () => {
    expect(progressBar(0, 100, 5)).toBe('🔘▬▬▬▬');
    expect(progressBar(100, 100, 5)).toBe('▬▬▬▬🔘');
    expect(progressBar(50, 100, 5)).toBe('▬▬🔘▬▬');
  });
});
