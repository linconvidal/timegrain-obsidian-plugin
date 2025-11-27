import { describe, it, expect } from 'vitest';

/**
 * Tests for session repository edge cases
 * Bug: Energy level 0 and hour 0 (midnight) would become undefined
 * due to `safeInt(val) || undefined` treating 0 as falsy
 */

// Helper to simulate the bug and fix
function safeInt(value: unknown, defaultValue = 0): number {
  if (value === null || value === undefined) return defaultValue;
  const parsed = parseInt(String(value), 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

describe('Session Repository Edge Cases', () => {
  describe('energy level handling', () => {
    // Buggy implementation
    function getEnergyLevelBuggy(fmEnergyLevel: unknown): number | undefined {
      return safeInt(fmEnergyLevel) || undefined;
    }

    // Fixed implementation
    function getEnergyLevelFixed(fmEnergyLevel: unknown): number | undefined {
      return fmEnergyLevel != null ? safeInt(fmEnergyLevel) : undefined;
    }

    it('BUGGY: treats energy level 0 as undefined', () => {
      // This demonstrates the bug
      expect(getEnergyLevelBuggy(0)).toBeUndefined();
      expect(getEnergyLevelBuggy('0')).toBeUndefined();
    });

    it('FIXED: preserves energy level 0', () => {
      expect(getEnergyLevelFixed(0)).toBe(0);
      expect(getEnergyLevelFixed('0')).toBe(0);
    });

    it('FIXED: returns undefined for null/undefined', () => {
      expect(getEnergyLevelFixed(null)).toBeUndefined();
      expect(getEnergyLevelFixed(undefined)).toBeUndefined();
    });

    it('FIXED: handles normal energy levels (1-5)', () => {
      expect(getEnergyLevelFixed(1)).toBe(1);
      expect(getEnergyLevelFixed(2)).toBe(2);
      expect(getEnergyLevelFixed(3)).toBe(3);
      expect(getEnergyLevelFixed(4)).toBe(4);
      expect(getEnergyLevelFixed(5)).toBe(5);
    });

    it('FIXED: handles string energy levels', () => {
      expect(getEnergyLevelFixed('1')).toBe(1);
      expect(getEnergyLevelFixed('5')).toBe(5);
    });
  });

  describe('hour of day handling', () => {
    // Buggy implementation
    function getHourOfDayBuggy(fmHourOfDay: unknown): number | undefined {
      return safeInt(fmHourOfDay) || undefined;
    }

    // Fixed implementation
    function getHourOfDayFixed(fmHourOfDay: unknown): number | undefined {
      return fmHourOfDay != null ? safeInt(fmHourOfDay) : undefined;
    }

    it('BUGGY: treats hour 0 (midnight) as undefined', () => {
      // This demonstrates the bug
      expect(getHourOfDayBuggy(0)).toBeUndefined();
      expect(getHourOfDayBuggy('0')).toBeUndefined();
    });

    it('FIXED: preserves hour 0 (midnight)', () => {
      expect(getHourOfDayFixed(0)).toBe(0);
      expect(getHourOfDayFixed('0')).toBe(0);
    });

    it('FIXED: returns undefined for null/undefined', () => {
      expect(getHourOfDayFixed(null)).toBeUndefined();
      expect(getHourOfDayFixed(undefined)).toBeUndefined();
    });

    it('FIXED: handles all hours (0-23)', () => {
      for (let hour = 0; hour < 24; hour++) {
        expect(getHourOfDayFixed(hour)).toBe(hour);
      }
    });

    it('FIXED: handles string hours', () => {
      expect(getHourOfDayFixed('0')).toBe(0);
      expect(getHourOfDayFixed('12')).toBe(12);
      expect(getHourOfDayFixed('23')).toBe(23);
    });
  });

  describe('safeInt utility', () => {
    it('returns 0 for null', () => {
      expect(safeInt(null)).toBe(0);
    });

    it('returns 0 for undefined', () => {
      expect(safeInt(undefined)).toBe(0);
    });

    it('returns default value for null', () => {
      expect(safeInt(null, 5)).toBe(5);
    });

    it('parses valid integers', () => {
      expect(safeInt(42)).toBe(42);
      expect(safeInt('42')).toBe(42);
      expect(safeInt(0)).toBe(0);
      expect(safeInt('0')).toBe(0);
    });

    it('returns default for invalid strings', () => {
      expect(safeInt('not a number')).toBe(0);
      expect(safeInt('not a number', 99)).toBe(99);
    });

    it('truncates floats', () => {
      expect(safeInt(3.7)).toBe(3);
      expect(safeInt('3.7')).toBe(3);
    });
  });
});

describe('Session Frontmatter Parsing', () => {
  interface MockSessionFrontmatter {
    energy_level?: number | string | null;
    hour_of_day?: number | string | null;
    day_of_week?: string;
  }

  interface ParsedSession {
    energyLevel?: number;
    hourOfDay?: number;
    dayOfWeek?: string;
  }

  // Fixed parser function
  function parseSession(fm: MockSessionFrontmatter): ParsedSession {
    return {
      energyLevel: fm.energy_level != null ? safeInt(fm.energy_level) : undefined,
      hourOfDay: fm.hour_of_day != null ? safeInt(fm.hour_of_day) : undefined,
      dayOfWeek: fm.day_of_week,
    };
  }

  it('parses session with energy 0 and hour 0', () => {
    const fm: MockSessionFrontmatter = {
      energy_level: 0,
      hour_of_day: 0,
      day_of_week: 'monday',
    };

    const session = parseSession(fm);
    expect(session.energyLevel).toBe(0);
    expect(session.hourOfDay).toBe(0);
    expect(session.dayOfWeek).toBe('monday');
  });

  it('parses session with missing energy and hour', () => {
    const fm: MockSessionFrontmatter = {
      day_of_week: 'tuesday',
    };

    const session = parseSession(fm);
    expect(session.energyLevel).toBeUndefined();
    expect(session.hourOfDay).toBeUndefined();
    expect(session.dayOfWeek).toBe('tuesday');
  });

  it('parses session with null energy and hour', () => {
    const fm: MockSessionFrontmatter = {
      energy_level: null,
      hour_of_day: null,
      day_of_week: 'wednesday',
    };

    const session = parseSession(fm);
    expect(session.energyLevel).toBeUndefined();
    expect(session.hourOfDay).toBeUndefined();
  });

  it('parses session with string values', () => {
    const fm: MockSessionFrontmatter = {
      energy_level: '3',
      hour_of_day: '14',
      day_of_week: 'thursday',
    };

    const session = parseSession(fm);
    expect(session.energyLevel).toBe(3);
    expect(session.hourOfDay).toBe(14);
  });

  it('handles edge case: energy 1 at midnight', () => {
    const fm: MockSessionFrontmatter = {
      energy_level: 1,
      hour_of_day: 0,
      day_of_week: 'friday',
    };

    const session = parseSession(fm);
    expect(session.energyLevel).toBe(1);
    expect(session.hourOfDay).toBe(0);
  });

  it('handles edge case: late night session at 23:xx', () => {
    const fm: MockSessionFrontmatter = {
      energy_level: 2,
      hour_of_day: 23,
    };

    const session = parseSession(fm);
    expect(session.energyLevel).toBe(2);
    expect(session.hourOfDay).toBe(23);
  });
});
