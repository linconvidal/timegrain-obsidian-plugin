import { describe, it, expect } from 'vitest';

/**
 * Tests for calendar timeline edge cases
 * Bug: Sessions spanning midnight (e.g., 23:00 to 01:00 next day) weren't displayed correctly
 */

interface MockSession {
  started: Date;
  ended: Date | null;
}

/**
 * Helper to check if a session should appear in a given hour on a given day
 * Fixed implementation from CalendarView.tsx
 */
function sessionAppearsInHour(
  session: MockSession,
  viewDate: Date,
  hour: number,
  isSameDay: (d1: Date, d2: Date) => boolean
): boolean {
  const startH = session.started.getHours();
  const endDate = session.ended || new Date();
  const endH = endDate.getHours();

  // Handle same-day sessions
  if (isSameDay(session.started, endDate)) {
    return startH <= hour && endH >= hour;
  }

  // Handle midnight-spanning sessions (started on this day, ended next day)
  // Check if we're viewing the start date
  if (isSameDay(session.started, viewDate)) {
    // Session spans from startH to 23:59 on this day
    return startH <= hour;
  }

  return false;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

describe('Calendar Timeline - Midnight Spanning Sessions', () => {
  describe('same-day sessions', () => {
    it('shows session in correct hours', () => {
      const viewDate = new Date(2024, 10, 25); // Nov 25
      const session: MockSession = {
        started: new Date(2024, 10, 25, 10, 0), // 10:00 AM
        ended: new Date(2024, 10, 25, 12, 30),  // 12:30 PM
      };

      expect(sessionAppearsInHour(session, viewDate, 9, isSameDay)).toBe(false);
      expect(sessionAppearsInHour(session, viewDate, 10, isSameDay)).toBe(true);
      expect(sessionAppearsInHour(session, viewDate, 11, isSameDay)).toBe(true);
      expect(sessionAppearsInHour(session, viewDate, 12, isSameDay)).toBe(true);
      expect(sessionAppearsInHour(session, viewDate, 13, isSameDay)).toBe(false);
    });
  });

  describe('midnight-spanning sessions', () => {
    it('shows session from start time to midnight on start day', () => {
      const viewDate = new Date(2024, 10, 25); // Nov 25
      const session: MockSession = {
        started: new Date(2024, 10, 25, 23, 0), // 11:00 PM Nov 25
        ended: new Date(2024, 10, 26, 1, 0),    // 1:00 AM Nov 26
      };

      // Viewing Nov 25 - should show from 23:00 to end of day
      expect(sessionAppearsInHour(session, viewDate, 22, isSameDay)).toBe(false);
      expect(sessionAppearsInHour(session, viewDate, 23, isSameDay)).toBe(true);
    });

    it('BUGGY: old logic incorrectly hides midnight-spanning sessions', () => {
      // This demonstrates the old bug
      const session: MockSession = {
        started: new Date(2024, 10, 25, 23, 0),
        ended: new Date(2024, 10, 26, 1, 0),
      };

      const startH = session.started.getHours(); // 23
      const endH = session.ended!.getHours();    // 1
      const hour = 23;

      // Old buggy logic: startH <= hour && endH >= hour
      // 23 <= 23 && 1 >= 23 = true && false = false (WRONG!)
      const buggyResult = startH <= hour && endH >= hour;
      expect(buggyResult).toBe(false); // Bug caused this to be false
    });

    it('handles session starting late and ending early next day', () => {
      const viewDate = new Date(2024, 10, 25);
      const session: MockSession = {
        started: new Date(2024, 10, 25, 22, 30), // 10:30 PM
        ended: new Date(2024, 10, 26, 2, 0),     // 2:00 AM next day
      };

      expect(sessionAppearsInHour(session, viewDate, 21, isSameDay)).toBe(false);
      expect(sessionAppearsInHour(session, viewDate, 22, isSameDay)).toBe(true);
      expect(sessionAppearsInHour(session, viewDate, 23, isSameDay)).toBe(true);
    });
  });

  describe('ongoing sessions (no end time)', () => {
    it('handles ongoing same-day session', () => {
      const viewDate = new Date(2024, 10, 25);
      const currentTime = new Date(2024, 10, 25, 14, 30);

      const session: MockSession = {
        started: new Date(2024, 10, 25, 10, 0),
        ended: null, // Ongoing
      };

      // Mock current time by treating ended as null -> uses current time
      // For this test, we simulate the behavior
      const endDate = session.ended || currentTime;
      const startH = session.started.getHours();
      const endH = endDate.getHours();

      // Should show from 10 to current hour (14)
      expect(startH <= 10 && endH >= 10).toBe(true);
      expect(startH <= 14 && endH >= 14).toBe(true);
      expect(startH <= 15 && endH >= 15).toBe(false);
    });
  });
});

describe('Calendar Timeline - Hour Range Calculation', () => {
  /**
   * Calculate hour range for timeline display
   */
  function calculateHourRange(
    sessions: MockSession[],
    isSameDayFn: (d1: Date, d2: Date) => boolean
  ): { startHour: number; endHour: number } {
    let minHour = 7;
    let maxHour = 22;

    sessions.forEach((session) => {
      const startH = session.started.getHours();
      const endDate = session.ended || new Date();

      // For midnight-spanning sessions, extend to 24
      if (!isSameDayFn(session.started, endDate)) {
        maxHour = 24;
      } else {
        maxHour = Math.max(maxHour, endDate.getHours() + 1);
      }
      minHour = Math.min(minHour, startH);
    });

    return { startHour: minHour, endHour: Math.min(maxHour, 24) };
  }

  it('uses default range when no sessions', () => {
    const range = calculateHourRange([], isSameDay);
    expect(range.startHour).toBe(7);
    expect(range.endHour).toBe(22);
  });

  it('extends range for early sessions', () => {
    const sessions: MockSession[] = [
      {
        started: new Date(2024, 10, 25, 5, 0), // 5 AM
        ended: new Date(2024, 10, 25, 6, 0),
      },
    ];
    const range = calculateHourRange(sessions, isSameDay);
    expect(range.startHour).toBe(5);
  });

  it('extends range for late sessions', () => {
    const sessions: MockSession[] = [
      {
        started: new Date(2024, 10, 25, 23, 0), // 11 PM
        ended: new Date(2024, 10, 25, 23, 30),
      },
    ];
    const range = calculateHourRange(sessions, isSameDay);
    expect(range.endHour).toBe(24);
  });

  it('extends to midnight for overnight sessions', () => {
    const sessions: MockSession[] = [
      {
        started: new Date(2024, 10, 25, 22, 0),
        ended: new Date(2024, 10, 26, 1, 0), // Next day
      },
    ];
    const range = calculateHourRange(sessions, isSameDay);
    expect(range.endHour).toBe(24);
  });
});

describe('Expected Energy Field Handling', () => {
  /**
   * Fixed expected energy parsing
   */
  function getExpectedEnergy(
    frontmatter: { expected_energy?: number | null; 'expected energy'?: number | null }
  ): number {
    // Check both field names (underscore and space), prefer underscore
    return frontmatter.expected_energy != null
      ? frontmatter.expected_energy
      : (frontmatter['expected energy'] ?? 0);
  }

  it('prefers expected_energy over expected energy', () => {
    expect(getExpectedEnergy({ expected_energy: 3, 'expected energy': 5 })).toBe(3);
  });

  it('falls back to expected energy when underscore version is null', () => {
    expect(getExpectedEnergy({ expected_energy: null, 'expected energy': 5 })).toBe(5);
  });

  it('preserves energy level 0 from underscore field', () => {
    expect(getExpectedEnergy({ expected_energy: 0, 'expected energy': 5 })).toBe(0);
  });

  it('preserves energy level 0 from space field', () => {
    expect(getExpectedEnergy({ 'expected energy': 0 })).toBe(0);
  });

  it('returns 0 when both are undefined', () => {
    expect(getExpectedEnergy({})).toBe(0);
  });

  it('BUGGY: old logic treats 0 as falsy and falls through', () => {
    // Old buggy implementation: safeInt(fm.expected_energy) || safeInt(fm['expected energy'], 0)
    // When expected_energy is 0, it's falsy so || evaluates the right side
    const fm = { expected_energy: 0, 'expected energy': 5 };
    const buggyResult = fm.expected_energy || fm['expected energy'] || 0;
    expect(buggyResult).toBe(5); // Wrong! Should be 0
  });
});
