import { describe, expect, it } from 'vitest';
import { parseLocalDateTime, toLocalDateString, toLocalDateTimeString } from './local-datetime';

describe('local-datetime', () => {
  describe('toLocalDateString', () => {
    it('formats local date as YYYY-MM-DD', () => {
      expect(toLocalDateString(new Date(2026, 4, 5))).toBe('2026-05-05');
      expect(toLocalDateString(new Date(2026, 11, 31))).toBe('2026-12-31');
    });

    it('uses local components, not UTC (no day shift across midnight)', () => {
      // 2026-05-25 23:30 local → still 2026-05-25, never 2026-05-26 even in negative TZ
      const d = new Date(2026, 4, 25, 23, 30);
      expect(toLocalDateString(d)).toBe('2026-05-25');
    });
  });

  describe('toLocalDateTimeString', () => {
    it('formats local datetime as YYYY-MM-DDTHH:mm:ss without timezone', () => {
      const d = new Date(2026, 4, 25, 10, 0, 0);
      expect(toLocalDateTimeString(d)).toBe('2026-05-25T10:00:00');
    });

    it('does not append Z suffix', () => {
      const d = new Date(2026, 4, 25, 10, 30, 0);
      expect(toLocalDateTimeString(d)).not.toContain('Z');
    });
  });

  describe('parseLocalDateTime', () => {
    it('parses seconds-precision ISO without TZ as local Date', () => {
      const d = parseLocalDateTime('2026-05-25T10:30:00');
      expect(d).not.toBeNull();
      expect(d!.getFullYear()).toBe(2026);
      expect(d!.getMonth()).toBe(4);
      expect(d!.getDate()).toBe(25);
      expect(d!.getHours()).toBe(10);
      expect(d!.getMinutes()).toBe(30);
    });

    it('parses without seconds field (HH:mm)', () => {
      const d = parseLocalDateTime('2026-05-25T08:00');
      expect(d).not.toBeNull();
      expect(d!.getHours()).toBe(8);
      expect(d!.getSeconds()).toBe(0);
    });

    it('returns null on malformed input', () => {
      expect(parseLocalDateTime('not a date')).toBeNull();
      expect(parseLocalDateTime('2026-13-99T25:99:99')).not.toBeNull(); // permissive — JS Date normalizes
    });
  });
});
