import type { Attachment, BaseMessageOptions, GuildMember, Message } from 'discord.js';
import { UserError } from '../core/errors.js';

type Payload = string | (BaseMessageOptions & { flags?: unknown; withResponse?: boolean; fetchReply?: boolean });

/** Opções já convertidas do texto digitado (mesma interface do `interaction.options`). */
class OptionBag {
  constructor(private readonly values: Record<string, unknown>) {}

  private get<T>(name: string, required: boolean, check: (value: unknown) => value is T): T | null {
    const value = this.values[name];
    if (value === undefined || value === null) {
      if (required) throw new UserError(`Faltou informar: ${name}.`);
      return null;
    }
    if (!check(value)) throw new UserError(`Valor inválido para ${name}.`);
    return value;
  }

  getString(name: string, required = false): string | null {
    return this.get(name, required, (v): v is string => typeof v === 'string');
  }
  getInteger(name: string, required = false): number | null {
    return this.get(name, required, (v): v is number => typeof v === 'number');
  }
  getBoolean(name: string, required = false): boolean | null {
    return this.get(name, required, (v): v is boolean => typeof v === 'boolean');
  }
  getAttachment(name: string, required = false): Attachment | null {
    return this.get(name, required, (v): v is Attachment => typeof v === 'object');
  }
}

/**
 * Faz uma mensagem ("n!play ...") se comportar como a interação de um comando de barra, para que
 * os mesmos comandos atendam os dois estilos sem duplicar código. Implementa só o que os comandos usam.
 */
export class MessageInteraction {
  readonly options: OptionBag;
  deferred = false;
  replied = false;
  private replyMessage: Message | null = null;

  constructor(
    private readonly message: Message<true>,
    readonly commandName: string,
    values: Record<string, unknown>,
  ) {
    this.options = new OptionBag(values);
  }

  get member(): GuildMember {
    if (!this.message.member) throw new UserError('Não consegui identificar você neste servidor.');
    return this.message.member;
  }
  get user() {
    return this.message.author;
  }
  get guild() {
    return this.message.guild;
  }
  get guildId() {
    return this.message.guildId;
  }
  get channel() {
    return this.message.channel;
  }
  get client() {
    return this.message.client;
  }

  async deferReply(): Promise<void> {
    this.deferred = true;
    await this.message.channel.sendTyping().catch(() => {});
  }

  async reply(payload: Payload): Promise<unknown> {
    const message = await this.send(payload);
    this.replied = true;
    // O Discord devolve { resource: { message } } quando pedimos `withResponse`.
    return typeof payload === 'object' && payload.withResponse ? { resource: { message } } : message;
  }

  async editReply(payload: Payload): Promise<Message> {
    if (this.replyMessage) {
      const { flags: _flags, withResponse: _w, fetchReply: _f, ...rest } = typeof payload === 'string' ? { content: payload } : payload;
      this.replyMessage = await this.replyMessage.edit(rest as never);
      return this.replyMessage;
    }
    const message = await this.send(payload);
    this.replied = true;
    return message;
  }

  private async send(payload: Payload): Promise<Message> {
    const { flags: _flags, withResponse: _w, fetchReply: _f, ...rest } = typeof payload === 'string' ? { content: payload } : payload;
    this.replyMessage = await this.message.reply({
      ...(rest as BaseMessageOptions),
      allowedMentions: { parse: [], repliedUser: false },
      failIfNotExists: false,
    });
    return this.replyMessage;
  }
}
