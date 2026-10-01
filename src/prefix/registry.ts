import type { Message } from 'discord.js';
import type { CommandCategory } from '../core/types.js';
import { UserError } from '../core/errors.js';

export interface PrefixSpec {
  /** Nome-base (igual ao do comando de barra, quando existe). */
  id: string;
  /** Todas as formas de chamar, sem o prefixo. A primeira é inglês, a segunda português. */
  names: string[];
  category: CommandCategory;
  /** Comando de barra que executa a ação (ou função que escolhe, ex.: pausar alterna com retomar). */
  slash: string | ((state: { isPaused: boolean }) => string);
  /** Texto de uso, mostrado em caso de erro e no /help. */
  usage: string;
  /** Descrição (só para comandos que não existem como comando de barra). */
  description?: string;
  /** Converte o texto digitado nas opções que o comando de barra espera. */
  parse(args: string, message: Message<true>): Record<string, unknown>;
}

const none = (): Record<string, unknown> => ({});

function fail(spec: { names: string[]; usage?: string }, problem: string): never {
  throw new UserError(`${problem}\nUso: \`n!${spec.names[1] ?? spec.names[0]} ${spec.usage ?? ''}\``.trim());
}

function text(spec: { names: string[]; usage?: string }, args: string, what: string): string {
  if (args.trim() === '') fail(spec, `Faltou informar ${what}.`);
  return args.trim();
}

function integer(spec: { names: string[]; usage?: string }, token: string | undefined, what: string, required: true): number;
function integer(spec: { names: string[]; usage?: string }, token: string | undefined, what: string, required: false): number | undefined;
function integer(spec: { names: string[]; usage?: string }, token: string | undefined, what: string, required: boolean) {
  if (token === undefined || token === '') {
    if (required) fail(spec, `Faltou informar ${what}.`);
    return undefined;
  }
  if (!/^-?\d{1,6}$/.test(token)) fail(spec, `"${token.slice(0, 20)}" não é um número válido para ${what}.`);
  return Number(token);
}

const LOOP_WORDS: Record<string, 'off' | 'track' | 'queue'> = {
  off: 'off', desligar: 'off', desativar: 'off', nenhum: 'off', parar: 'off',
  track: 'track', musica: 'track', música: 'track', faixa: 'track', atual: 'track', one: 'track',
  queue: 'queue', fila: 'queue', tudo: 'queue', todas: 'queue', all: 'queue',
};

type SpecInput = Omit<PrefixSpec, 'parse' | 'usage'> & { usage?: string; parse?: PrefixSpec['parse'] };
const define = (input: SpecInput): PrefixSpec => ({ usage: '', parse: none, ...input });

export const PREFIX_SPECS: PrefixSpec[] = [
  // ----- Tocar -----
  define({
    id: 'play', names: ['play', 'tocar'], category: 'Tocar', slash: 'play', usage: '<nome da música ou link>',
    parse(args) {
      return { busca: text(this, args, 'o nome da música ou um link'), proxima: false };
    },
  }),
  define({
    id: 'playnext', names: ['playnext', 'tocarja'], category: 'Tocar', slash: 'play', usage: '<nome da música ou link>',
    description: 'Coloca a música no início da fila, para tocar logo depois da atual',
    parse(args) {
      return { busca: text(this, args, 'o nome da música ou um link'), proxima: true };
    },
  }),
  define({
    id: 'playlist', names: ['playlist', 'lista'], category: 'Tocar', slash: 'play', usage: '<link da playlist>',
    description: 'Toca uma playlist inteira (YouTube, Spotify) ou um álbum',
    parse(args) {
      return { busca: text(this, args, 'o link da playlist'), proxima: false };
    },
  }),
  define({
    id: 'playfile', names: ['playfile', 'arquivo'], category: 'Tocar', slash: 'playfile', usage: '(anexe o arquivo de áudio na mensagem)',
    parse(_args, message) {
      const arquivo = message.attachments.first();
      if (!arquivo) fail(this, 'Anexe um arquivo de áudio na mesma mensagem.');
      return { arquivo, proxima: false };
    },
  }),
  define({
    id: 'search', names: ['search', 'buscar'], category: 'Tocar', slash: 'search', usage: '<o que pesquisar>',
    parse(args) {
      return { busca: text(this, args, 'o que pesquisar') };
    },
  }),

  // ----- Controle -----
  define({
    id: 'pause', names: ['pause', 'pausar'], category: 'Controle',
    slash: (state) => (state.isPaused ? 'resume' : 'pause'),
    description: 'Pausa a música (se já estiver pausada, continua)',
  }),
  define({ id: 'resume', names: ['resume', 'continuar', 'retomar'], category: 'Controle', slash: 'resume' }),
  define({
    id: 'skip', names: ['skip', 'next', 'pular', 'proxima', 'trocar'], category: 'Controle', slash: 'skip',
    description: 'Pula para a próxima música da fila',
  }),
  define({
    id: 'skipto', names: ['skipto', 'pularpara'], category: 'Controle', slash: 'skipto', usage: '<posição>',
    parse(args) {
      return { posicao: integer(this, args.trim().split(/\s+/)[0], 'a posição', true) };
    },
  }),
  define({ id: 'previous', names: ['previous', 'back', 'voltar', 'anterior'], category: 'Controle', slash: 'previous' }),
  define({
    id: 'seek', names: ['seek', 'ir'], category: 'Controle', slash: 'seek', usage: '<tempo, ex.: 1:30>',
    parse(args) {
      return { tempo: text(this, args, 'o tempo') };
    },
  }),
  define({
    id: 'forward', names: ['forward', 'avancar', 'avançar'], category: 'Controle', slash: 'forward', usage: '[segundos]',
    parse(args) {
      return { segundos: integer(this, args.trim().split(/\s+/)[0], 'os segundos', false) };
    },
  }),
  define({
    id: 'rewind', names: ['rewind', 'retroceder'], category: 'Controle', slash: 'rewind', usage: '[segundos]',
    parse(args) {
      return { segundos: integer(this, args.trim().split(/\s+/)[0], 'os segundos', false) };
    },
  }),
  define({ id: 'stop', names: ['stop', 'parar'], category: 'Controle', slash: 'stop' }),
  define({ id: 'leave', names: ['leave', 'sair', 'disconnect'], category: 'Controle', slash: 'leave' }),
  define({
    id: 'volume', names: ['volume', 'vol'], category: 'Controle', slash: 'volume', usage: '[0 a 200]',
    parse(args) {
      return { valor: integer(this, args.trim().split(/\s+/)[0], 'o volume', false) };
    },
  }),
  define({
    id: 'loop', names: ['loop', 'repetir'], category: 'Controle', slash: 'loop', usage: '[off | musica | fila]',
    parse(args) {
      const word = args.trim().toLowerCase().split(/\s+/)[0] ?? '';
      if (word === '') return {};
      const modo = LOOP_WORDS[word];
      if (!modo) fail(this, `"${word.slice(0, 20)}" não é um modo válido.`);
      return { modo };
    },
  }),

  // ----- Fila -----
  define({
    id: 'queue', names: ['queue', 'fila'], category: 'Fila', slash: 'queue', usage: '[página]',
    parse(args) {
      return { pagina: integer(this, args.trim().split(/\s+/)[0], 'a página', false) };
    },
  }),
  define({ id: 'nowplaying', names: ['nowplaying', 'np', 'tocando', 'agora'], category: 'Fila', slash: 'nowplaying' }),
  define({ id: 'shuffle', names: ['shuffle', 'embaralhar'], category: 'Fila', slash: 'shuffle' }),
  define({
    id: 'remove', names: ['remove', 'remover'], category: 'Fila', slash: 'remove', usage: '<posição>',
    parse(args) {
      return { posicao: integer(this, args.trim().split(/\s+/)[0], 'a posição', true) };
    },
  }),
  define({
    id: 'move', names: ['move', 'mover'], category: 'Fila', slash: 'move', usage: '<de> <para>',
    parse(args) {
      const [de, para] = args.trim().split(/\s+/);
      return { de: integer(this, de, 'a posição atual', true), para: integer(this, para, 'a nova posição', true) };
    },
  }),
  define({ id: 'clear', names: ['clear', 'limpar'], category: 'Fila', slash: 'clear' }),

  // ----- Geral -----
  define({ id: 'help', names: ['help', 'ajuda', 'comandos'], category: 'Geral', slash: 'help' }),
];

const BY_NAME = new Map<string, PrefixSpec>();
for (const spec of PREFIX_SPECS) {
  for (const name of spec.names) {
    if (BY_NAME.has(name)) throw new Error(`Nome de comando duplicado: ${name}`);
    BY_NAME.set(name, spec);
  }
}

export function findPrefixSpec(name: string): PrefixSpec | undefined {
  return BY_NAME.get(name.toLowerCase());
}

/** Extrai "n!comando args" ou "n.comando args". Retorna null se a mensagem não é um comando. */
export function parsePrefixMessage(content: string): { kind: '!' | '.'; name: string; args: string } | null {
  const match = /^n([!.])(\p{L}+)(?:\s+([\s\S]*))?$/iu.exec(content.trim());
  if (!match) return null;
  return { kind: match[1] as '!' | '.', name: match[2]!.toLowerCase(), args: (match[3] ?? '').trim() };
}
