export type SpotifyEntity = 'track' | 'album' | 'playlist' | 'artist';

export type ParsedQuery =
  | { type: 'search'; query: string }
  | { type: 'youtube-video'; url: string; videoId: string }
  | { type: 'youtube-playlist'; url: string; listId: string }
  | { type: 'spotify'; entity: SpotifyEntity; id: string; url: string }
  | { type: 'spotify-short'; url: string }
  | { type: 'spotify-unsupported'; url: string }
  | { type: 'direct-audio'; url: string }
  | { type: 'url'; url: string; host: string };

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'www.youtube-nocookie.com',
]);

const AUDIO_EXTENSIONS = /\.(mp3|ogg|oga|opus|wav|flac|m4a|aac|weba|webm|mp4|m4v|mov|mkv)$/i;
const VIDEO_ID = /^[\w-]{11}$/;
const SPOTIFY_ENTITIES = new Set<string>(['track', 'album', 'playlist', 'artist']);

/**
 * Listas que não são playlists "de verdade": mixes automáticos (RD...) e listas privadas do usuário
 * (LL = curtidos, WL = assistir mais tarde). Nesses casos tocamos só o vídeo do link.
 */
function isRealPlaylist(listId: string): boolean {
  return !/^(RD|LL$|WL$)/.test(listId);
}

function parseUrl(input: string): URL | null {
  if (!/^https?:\/\//i.test(input)) return null;
  try {
    return new URL(input);
  } catch {
    return null;
  }
}

function parseYouTube(url: URL): ParsedQuery | null {
  const listId = url.searchParams.get('list');
  let videoId: string | null = null;

  if (url.hostname === 'youtu.be') {
    videoId = url.pathname.slice(1).split('/')[0] ?? null;
  } else if (url.pathname === '/watch') {
    videoId = url.searchParams.get('v');
  } else {
    const match = /^\/(?:shorts|live|embed|v)\/([\w-]{11})/.exec(url.pathname);
    videoId = match?.[1] ?? null;
  }

  if (listId && isRealPlaylist(listId) && (url.pathname === '/playlist' || url.pathname === '/watch' || url.hostname === 'youtu.be')) {
    return { type: 'youtube-playlist', url: `https://www.youtube.com/playlist?list=${listId}`, listId };
  }
  if (videoId && VIDEO_ID.test(videoId)) {
    return { type: 'youtube-video', url: `https://www.youtube.com/watch?v=${videoId}`, videoId };
  }
  return null;
}

function parseSpotifyUrl(url: URL): ParsedQuery {
  if (url.hostname === 'spotify.link' || url.hostname === 'spotify.app.link') {
    return { type: 'spotify-short', url: url.href };
  }
  // Ex.: /intl-pt/track/{id} ou /track/{id}
  const segments = url.pathname.split('/').filter(Boolean).filter((segment) => !segment.startsWith('intl-'));
  const [entity, id] = segments;
  if (entity && id && SPOTIFY_ENTITIES.has(entity) && /^[A-Za-z0-9]+$/.test(id)) {
    return { type: 'spotify', entity: entity as SpotifyEntity, id, url: `https://open.spotify.com/${entity}/${id}` };
  }
  return { type: 'spotify-unsupported', url: url.href };
}

export function parseQuery(raw: string): ParsedQuery {
  const input = raw.trim().replace(/^<(.+)>$/, '$1'); // o Discord permite colar links como <https://...>

  const spotifyUri = /^spotify:(track|album|playlist|artist):([A-Za-z0-9]+)$/.exec(input);
  if (spotifyUri) {
    const [, entity, id] = spotifyUri;
    return { type: 'spotify', entity: entity as SpotifyEntity, id: id!, url: `https://open.spotify.com/${entity}/${id}` };
  }

  const url = parseUrl(input);
  if (!url) return { type: 'search', query: input };

  const host = url.hostname.toLowerCase();
  if (YOUTUBE_HOSTS.has(host)) {
    return parseYouTube(url) ?? { type: 'url', url: url.href, host };
  }
  if (host === 'open.spotify.com' || host.endsWith('spotify.link') || host === 'spotify.app.link') {
    return parseSpotifyUrl(url);
  }
  if (AUDIO_EXTENSIONS.test(url.pathname)) {
    return { type: 'direct-audio', url: url.href };
  }
  return { type: 'url', url: url.href, host };
}

export function isAudioFileName(name: string): boolean {
  return AUDIO_EXTENSIONS.test(name);
}
