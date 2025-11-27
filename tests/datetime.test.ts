import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  parseDateTime,
  formatDateTimeISO,
  formatSessionFilename,
  getDayName,
  formatDateOnly,
  isToday,
  isSameDay,
  daysBetween,
  getLastNDays,
} from '../src/utils/datetime';

describe('datetime utilities', () => {
  describe('parseDateTime', () => {
    it('should parse ISO datetime string', () => {
      const date = parseDateTime('2024-03-15T10:30:00');
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(2); // March is 2
      expect(date.getDate()).toBe(15);
      expect(date.getHours()).toBe(10);
      expect(date.getMinutes()).toBe(30);
    });

    it('should parse legacy datetime format with space', () => {
      const date = parseDateTime('2024-03-15 10:30:00');
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(2);
      expect(date.getDate()).toBe(15);
      expect(date.getHours()).toBe(10);
      expect(date.getMinutes()).toBe(30);
    });

    it('should parse date-only string', () => {
      const date = parseDateTime('2024-03-15');
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(2);
      expect(date.getDate()).toBe(15);
    });

    it('should return Date object if already a Date', () => {
      const input = new Date('2024-03-15T10:30:00');
      const result = parseDateTime(input);
      expect(result).toBe(input);
    });

    it('should throw for invalid input', () => {
      expect(() => parseDateTime('invalid')).toThrow('Unable to parse datetime');
    });

    it('should throw for timestamp number', () => {
      // Numbers are converted to string and don't match any pattern
      expect(() => parseDateTime(1710499800000)).toThrow('Unable to parse datetime');
    });
  });

  describe('formatDateTimeISO', () => {
    it('should format Date to ISO string without milliseconds', () => {
      const date = new Date(2024, 2, 15, 10, 30, 45);
      const result = formatDateTimeISO(date);
      expect(result).toBe('2024-03-15T10:30:45');
    });

    it('should pad single digit values', () => {
      const date = new Date(2024, 0, 5, 8, 5, 3);
      const result = formatDateTimeISO(date);
      expect(result).toBe('2024-01-05T08:05:03');
    });
  });

  describe('formatSessionFilename', () => {
    it('should create filename from date in YYYYMMDD-HHMM format (flowtime compatible)', () => {
      const date = new Date(2024, 2, 15, 10, 30, 45);
      const result = formatSessionFilename(date);
      expect(result).toBe('20240315-1030');
    });

    it('should pad single digit values', () => {
      const date = new Date(2024, 0, 5, 8, 5, 3);
      const result = formatSessionFilename(date);
      expect(result).toBe('20240105-0805');
    });

    it('should match flowtime session filename format', () => {
      // Flowtime uses YYYYMMDD-HHMM format without seconds
      const date = new Date(2024, 2, 15, 10, 30, 0);
      expect(formatSessionFilename(date)).toBe('20240315-1030');
    });
  });

  describe('getDayName', () => {
    it('should return lowercase day name', () => {
      // Friday March 15, 2024
      const date = new Date(2024, 2, 15, 12, 0, 0);
      const result = getDayName(date);
      expect(result).toBe('friday');
    });

    it('should handle different days', () => {
      const sunday = new Date(2024, 2, 17, 12, 0, 0);
      expect(getDayName(sunday)).toBe('sunday');

      const monday = new Date(2024, 2, 18, 12, 0, 0);
      expect(getDayName(monday)).toBe('monday');
    });
  });

  describe('formatDateOnly', () => {
    it('should format date as YYYY-MM-DD', () => {
      const date = new Date(2024, 2, 15, 10, 30, 0);
      const result = formatDateOnly(date);
      expect(result).toBe('2024-03-15');
    });

    it('should pad single-digit months and days', () => {
      const date = new Date(2024, 0, 5, 10, 30, 0);
      const result = formatDateOnly(date);
      expect(result).toBe('2024-01-05');
    });
  });

  describe('isToday', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 2, 15, 12, 0, 0));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return true for today', () => {
      const today = new Date(2024, 2, 15, 8, 30, 0);
      expect(isToday(today)).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = new Date(2024, 2, 14, 12, 0, 0);
      expect(isToday(yesterday)).toBe(false);
    });

    it('should return false for tomorrow', () => {
      const tomorrow = new Date(2024, 2, 16, 12, 0, 0);
      expect(isToday(tomorrow)).toBe(false);
    });
  });

  describe('isSameDay', () => {
    it('should return true for same day different times', () => {
      const date1 = new Date(2024, 2, 15, 8, 0, 0);
      const date2 = new Date(2024, 2, 15, 20, 0, 0);
      expect(isSameDay(date1, date2)).toBe(true);
    });

    it('should return false for different days', () => {
      const date1 = new Date(2024, 2, 15, 12, 0, 0);
      const date2 = new Date(2024, 2, 16, 12, 0, 0);
      expect(isSameDay(date1, date2)).toBe(false);
    });
  });

  describe('daysBetween', () => {
    it('should return 0 for same day', () => {
      const date1 = new Date(2024, 2, 15, 8, 0, 0);
      const date2 = new Date(2024, 2, 15, 20, 0, 0);
      expect(daysBetween(date1, date2)).toBe(0);
    });

    it('should return correct days difference', () => {
      const date1 = new Date(2024, 2, 15);
      const date2 = new Date(2024, 2, 20);
      expect(daysBetween(date1, date2)).toBe(5);
    });

    it('should work regardless of order', () => {
      const date1 = new Date(2024, 2, 20);
      const date2 = new Date(2024, 2, 15);
      expect(daysBetween(date1, date2)).toBe(5);
    });
  });

  describe('getLastNDays', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 2, 15, 12, 0, 0));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return array of dates including today', () => {
      const days = getLastNDays(3);
      expect(days).toHaveLength(3);
      expect(days[2].getDate()).toBe(15); // Today
      expect(days[1].getDate()).toBe(14); // Yesterday
      expect(days[0].getDate()).toBe(13); // Day before yesterday
    });

    it('should return single day for n=1', () => {
      const days = getLastNDays(1);
      expect(days).toHaveLength(1);
      expect(days[0].getDate()).toBe(15);
    });
  });
});
