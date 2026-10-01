/** 83_000 -> "1:23"; 3_723_000 -> "1:02:03". */
export function formatDuration(ms: number | undefined): string {
  if (ms === undefined || !Number.isFinite(ms) || ms < 0) return '--:--';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${ss}` : `${minutes}:${ss}`;
}

/**
 * Converte o que o usuário digita em milissegundos.
 * Aceita "90", "1:30", "01:02:03", "2m", "1m30s", "1h2m3s". Retorna `null` se não entender.
 */
export function parseTimestamp(input: string): number | null {
  const value = input.trim().toLowerCase();
  if (value === '') return null;

  if (/^\d+(:\d{1,2}){0,2}$/.test(value)) {
    const parts = value.split(':').map(Number);
    if (parts.slice(1).some((part) => part >= 60)) return null;
    return parts.reduce((total, part) => total * 60 + part, 0) * 1000;
  }

  const match = /^(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?$/.exec(value);
  if (!match || !match.slice(1).some(Boolean)) return null;
  const [, h = '0', m = '0', s = '0'] = match;
  return (Number(h) * 3600 + Number(m) * 60 + Number(s)) * 1000;
}

export function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/** Barra de progresso em texto: ▬▬▬▬🔘▬▬▬▬▬ */
export function progressBar(positionMs: number, durationMs: number, size = 16): string {
  if (durationMs <= 0) return '🔘' + '▬'.repeat(size - 1);
  const ratio = Math.min(Math.max(positionMs / durationMs, 0), 1);
  const index = Math.min(Math.round(ratio * (size - 1)), size - 1);
  return `${'▬'.repeat(index)}🔘${'▬'.repeat(size - 1 - index)}`;
}

/** Remove caracteres que quebram a marcação de links do Discord ([texto](url)). */
export function escapeLinkText(text: string): string {
  return text.replace(/[[\]()]/g, (char) => `\\${char}`).replace(/\n/g, ' ');
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
