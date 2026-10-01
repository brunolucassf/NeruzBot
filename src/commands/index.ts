import type { Command } from '../core/types.js';
import { forward, leave, loop, pause, previous, resume, rewind, seek, skip, skipTo, stop, volume } from './controls.js';
import { help } from './help.js';
import { play, playFile, search } from './play.js';
import { clear, move, nowPlaying, queue, remove, shuffle } from './queue.js';

/** Para adicionar um comando: crie-o em um destes arquivos e inclua-o nesta lista. */
export const commandList: Command[] = [
  play,
  playFile,
  search,
  pause,
  resume,
  skip,
  skipTo,
  previous,
  seek,
  forward,
  rewind,
  stop,
  leave,
  volume,
  loop,
  queue,
  nowPlaying,
  shuffle,
  remove,
  move,
  clear,
  help,
];

export const commands: ReadonlyMap<string, Command> = new Map(commandList.map((command) => [command.data.name, command]));
