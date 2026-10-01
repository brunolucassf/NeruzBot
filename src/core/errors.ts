/**
 * Erro "esperado", cuja mensagem pode ser mostrada diretamente ao usuário no Discord
 * (ex.: "você precisa estar em um canal de voz"). Qualquer outro erro é tratado como falha interna.
 */
export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserError';
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
