import { randomUUID } from 'node:crypto';

export type TrackSource = 'youtube' | 'spotify' | 'soundcloud' | 'attachment' | 'url';

export interface Requester {
  id: string;
  name: string;
}

export interface Track {
  /** Identificador interno único (o mesmo vídeo pode estar duas vezes na fila). */
  readonly id: string;
  title: string;
  author?: string;
  /** Link exibido para o usuário (página do YouTube, Spotify, anexo...). */
  url: string;
  /** Duração em ms; `undefined` quando desconhecida ou ao vivo. */
  durationMs?: number;
  thumbnail?: string;
  isLive: boolean;
  source: TrackSource;
  requester: Requester;
  /**
   * O que efetivamente será tocado. Para faixas do Spotify fica vazio até o momento de tocar,
   * quando é feita a busca equivalente no YouTube (resolução "preguiçosa").
   */
  playbackUrl?: string;
  /** `ytdlp` = extrair o áudio da página; `direct` = arquivo de áudio lido direto pelo FFmpeg. */
  playbackKind: 'ytdlp' | 'direct';
  /** Busca usada para achar a faixa no YouTube quando `playbackUrl` ainda não existe (Spotify). */
  searchQuery?: string;
}

export type TrackInput = Omit<Track, 'id' | 'isLive' | 'playbackKind'> &
  Partial<Pick<Track, 'isLive' | 'playbackKind'>>;

export function createTrack(input: TrackInput): Track {
  return { isLive: false, playbackKind: 'ytdlp', ...input, id: randomUUID() };
}

export const SOURCE_LABELS: Record<TrackSource, string> = {
  youtube: 'YouTube',
  spotify: 'Spotify',
  soundcloud: 'SoundCloud',
  attachment: 'Arquivo enviado',
  url: 'Link direto',
};
