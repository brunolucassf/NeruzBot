import { describe, expect, it } from 'vitest';
import { parseQuery } from '../src/utils/query.js';

describe('parseQuery', () => {
  it('texto livre vira busca', () => {
    expect(parseQuery('  henrique e juliano  ')).toEqual({ type: 'search', query: 'henrique e juliano' });
  });

  it.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ?si=abc',
    'https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=30',
    'https://music.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    'https://www.youtube.com/live/dQw4w9WgXcQ',
    '<https://www.youtube.com/watch?v=dQw4w9WgXcQ>',
    // mix automático (RD) toca só o vídeo
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RDdQw4w9WgXcQ',
  ])('vídeo do YouTube: %s', (input) => {
    expect(parseQuery(input)).toEqual({
      type: 'youtube-video',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      videoId: 'dQw4w9WgXcQ',
    });
  });

  it.each([
    'https://www.youtube.com/playlist?list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI&index=3',
    'https://music.youtube.com/playlist?list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI',
  ])('playlist do YouTube: %s', (input) => {
    expect(parseQuery(input)).toMatchObject({ type: 'youtube-playlist', listId: 'PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI' });
  });

  it.each([
    ['https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT?si=x', 'track'],
    ['https://open.spotify.com/intl-pt/album/4aawyAB9vmqN3uQ7FjRGTy', 'album'],
    ['https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M', 'playlist'],
    ['https://open.spotify.com/artist/0gxyHStUsqpMadRV0Di1Qt', 'artist'],
    ['spotify:track:4cOdK2wGLETKBW3PvgPWqT', 'track'],
  ])('Spotify %s', (input, entity) => {
    expect(parseQuery(input)).toMatchObject({ type: 'spotify', entity });
  });

  it('Spotify: links curtos e tipos não suportados', () => {
    expect(parseQuery('https://spotify.link/AbCdEf')).toMatchObject({ type: 'spotify-short' });
    expect(parseQuery('https://open.spotify.com/episode/123abc')).toMatchObject({ type: 'spotify-unsupported' });
  });

  it('arquivos de áudio diretos', () => {
    expect(parseQuery('https://cdn.discordapp.com/attachments/1/2/musica.mp3?ex=abc')).toMatchObject({ type: 'direct-audio' });
    expect(parseQuery('https://exemplo.com/audio.FLAC')).toMatchObject({ type: 'direct-audio' });
  });

  it('outros sites são tratados como link genérico', () => {
    expect(parseQuery('https://soundcloud.com/forss/flickermood')).toMatchObject({ type: 'url', host: 'soundcloud.com' });
  });
});
