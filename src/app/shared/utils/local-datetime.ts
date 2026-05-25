/**
 * Local-date / local-datetime helpers for talking to the backend's `LocalDate` /
 * `LocalDateTime` fields. The backend stores and returns these without a
 * timezone, so we must avoid `Date.toISOString()` (which converts to UTC and
 * shifts the day/hour depending on the user's TZ) and `new Date(s)` over a
 * naive ISO string (engines interpret it inconsistently — some as UTC).
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** Formats a Date as `YYYY-MM-DD` using its LOCAL components. */
export function toLocalDateString(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Formats a Date as `YYYY-MM-DDTHH:mm:ss` using its LOCAL components. */
export function toLocalDateTimeString(d: Date): string {
  return `${toLocalDateString(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * Parses a `LocalDateTime` string (`YYYY-MM-DDTHH:mm:ss[.fff]`, no timezone)
 * into a Date positioned at the equivalent LOCAL instant. Returns `null` if
 * the input doesn't match the expected shape.
 */
export function parseLocalDateTime(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/.exec(s);
  if (!m) return null;
  const [, y, mo, d, h, mi, se] = m;
  return new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(se ?? '0'));
}
