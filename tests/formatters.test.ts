import { describe, it, expect } from 'vitest';
import {
  formatDuration,
  formatSeconds,
  formatDurationHuman,
  formatPomodoros,
  calculatePomodoros,
  extractTaskName,
  createWikilink,
  formatEnergyLevel,
  createProgressBar,
  formatPercent,
  slugify,
  capitalize,
} from '../src/utils/formatters';
import { POMODORO_DURATION_MS } from '../src/constants';

describe('formatters', () => {
  describe('formatDuration', () => {
    it('should format milliseconds to MM:SS', () => {
      expect(formatDuration(0)).toBe('00:00');
      expect(formatDuration(59000)).toBe('00:59');
      expect(formatDuration(60000)).toBe('01:00');
      expect(formatDuration(90000)).toBe('01:30');
      expect(formatDuration(3599000)).toBe('59:59');
    });

    it('should format to HH:MM:SS when over an hour', () => {
      expect(formatDuration(3600000)).toBe('01:00:00');
      expect(formatDuration(3661000)).toBe('01:01:01');
      expect(formatDuration(7325000)).toBe('02:02:05');
    });

    it('should pad single digits', () => {
      expect(formatDuration(5000)).toBe('00:05');
      expect(formatDuration(65000)).toBe('01:05');
      expect(formatDuration(3605000)).toBe('01:00:05');
    });

    it('should include hours when explicitly requested', () => {
      expect(formatDuration(60000, true)).toBe('00:01:00');
      expect(formatDuration(0, true)).toBe('00:00:00');
    });
  });

  describe('formatSeconds', () => {
    it('should format seconds using formatDuration', () => {
      expect(formatSeconds(0)).toBe('00:00');
      expect(formatSeconds(59)).toBe('00:59');
      expect(formatSeconds(3600)).toBe('01:00:00');
    });
  });

  describe('formatDurationHuman', () => {
    it('should format milliseconds to Xm format', () => {
      expect(formatDurationHuman(0)).toBe('0m');
      expect(formatDurationHuman(30000)).toBe('0m');
      expect(formatDurationHuman(60000)).toBe('1m');
      expect(formatDurationHuman(120000)).toBe('2m');
    });

    it('should format hours as Xh', () => {
      expect(formatDurationHuman(3600000)).toBe('1h');
      expect(formatDurationHuman(7200000)).toBe('2h');
    });

    it('should combine hours and minutes as Xh Ym', () => {
      expect(formatDurationHuman(3660000)).toBe('1h 1m');
      expect(formatDurationHuman(7320000)).toBe('2h 2m');
      expect(formatDurationHuman(5400000)).toBe('1h 30m');
    });
  });

  describe('formatPomodoros', () => {
    it('should format zero pomodoros', () => {
      expect(formatPomodoros(0)).toBe('0 poms');
    });

    it('should format single pomodoro', () => {
      expect(formatPomodoros(1)).toBe('1 pom');
    });

    it('should format multiple pomodoros', () => {
      expect(formatPomodoros(2)).toBe('2 poms');
      expect(formatPomodoros(10)).toBe('10 poms');
    });

    it('should handle decimal pomodoros', () => {
      expect(formatPomodoros(1.5)).toBe('1.5 poms');
      expect(formatPomodoros(0.5)).toBe('0.5 poms');
    });
  });

  describe('calculatePomodoros', () => {
    it('should return 0 for less than one pomodoro', () => {
      expect(calculatePomodoros(0)).toBe(0);
      expect(calculatePomodoros(POMODORO_DURATION_MS - 1)).toBe(0);
    });

    it('should return exactly 1 for exactly one pomodoro', () => {
      expect(calculatePomodoros(POMODORO_DURATION_MS)).toBe(1);
    });

    it('should use floor, not round (only count completed pomodoros)', () => {
      // 1.5 pomodoros should be 1, not 2
      expect(calculatePomodoros(POMODORO_DURATION_MS * 1.5)).toBe(1);
      // 1.9 pomodoros should still be 1, not 2
      expect(calculatePomodoros(POMODORO_DURATION_MS * 1.9)).toBe(1);
      // 2.4 pomodoros should be 2, not 2
      expect(calculatePomodoros(POMODORO_DURATION_MS * 2.4)).toBe(2);
    });

    it('should match timer-service behavior', () => {
      // Exactly on boundary
      expect(calculatePomodoros(POMODORO_DURATION_MS * 3)).toBe(3);
      // Just under boundary
      expect(calculatePomodoros(POMODORO_DURATION_MS * 3 - 1)).toBe(2);
    });
  });

  describe('extractTaskName', () => {
    it('should extract name from wikilink', () => {
      expect(extractTaskName('[[My Task]]')).toBe('My Task');
      expect(extractTaskName('[[Project/Task Name]]')).toBe('Project/Task Name');
    });

    it('should return original if not a wikilink', () => {
      expect(extractTaskName('Plain Text')).toBe('Plain Text');
      expect(extractTaskName('No brackets')).toBe('No brackets');
    });

    it('should handle empty strings', () => {
      expect(extractTaskName('')).toBe('');
    });

    it('should handle partial brackets', () => {
      expect(extractTaskName('[[Incomplete')).toBe('[[Incomplete');
      expect(extractTaskName('Incomplete]]')).toBe('Incomplete]]');
    });
  });

  describe('createWikilink', () => {
    it('should create wikilink from name', () => {
      expect(createWikilink('My Task')).toBe('[[My Task]]');
      expect(createWikilink('Another Task')).toBe('[[Another Task]]');
    });

    it('should wrap even already wrapped (no check)', () => {
      // The current implementation doesn't check for existing wikilinks
      expect(createWikilink('[[Already Wrapped]]')).toBe('[[[[Already Wrapped]]]]');
    });

    it('should handle empty strings', () => {
      expect(createWikilink('')).toBe('[[]]');
    });
  });

  describe('formatEnergyLevel', () => {
    it('should show filled circles for energy level', () => {
      expect(formatEnergyLevel(1)).toBe('●○○○○');
      expect(formatEnergyLevel(3)).toBe('●●●○○');
      expect(formatEnergyLevel(5)).toBe('●●●●●');
    });

    it('should handle zero energy', () => {
      expect(formatEnergyLevel(0)).toBe('○○○○○');
    });

    it('should clamp negative values to 0', () => {
      expect(formatEnergyLevel(-1)).toBe('○○○○○');
      expect(formatEnergyLevel(-100)).toBe('○○○○○');
    });

    it('should clamp values above 5 to 5', () => {
      expect(formatEnergyLevel(6)).toBe('●●●●●');
      expect(formatEnergyLevel(100)).toBe('●●●●●');
    });

    it('should floor decimal values', () => {
      expect(formatEnergyLevel(2.7)).toBe('●●○○○');
      expect(formatEnergyLevel(3.9)).toBe('●●●○○');
    });
  });

  describe('createProgressBar', () => {
    it('should create progress bar based on percentage', () => {
      expect(createProgressBar(0, 10)).toBe('░░░░░░░░░░');
      expect(createProgressBar(5, 10)).toBe('█████░░░░░');
      expect(createProgressBar(10, 10)).toBe('██████████');
    });

    it('should handle zero total', () => {
      expect(createProgressBar(5, 0)).toBe('░░░░░░░░░░');
    });

    it('should support custom width', () => {
      // 5/10 = 50%, width 5 -> 2.5 rounds to 3
      expect(createProgressBar(5, 10, 5)).toBe('███░░');
      expect(createProgressBar(4, 10, 5)).toBe('██░░░');
    });
  });

  describe('formatPercent', () => {
    it('should format as percentage', () => {
      expect(formatPercent(5, 10)).toBe('50%');
      expect(formatPercent(3, 4)).toBe('75%');
      expect(formatPercent(0, 10)).toBe('0%');
    });

    it('should handle zero total', () => {
      expect(formatPercent(5, 0)).toBe('0%');
    });
  });

  describe('slugify', () => {
    it('should remove forbidden characters', () => {
      expect(slugify('Task: Name')).toBe('Task Name');
      expect(slugify('File/Name')).toBe('FileName');
      expect(slugify('Test*?<>|')).toBe('Test');
    });

    it('should collapse multiple spaces', () => {
      expect(slugify('Hello    World')).toBe('Hello World');
    });

    it('should trim whitespace', () => {
      expect(slugify('  Trimmed  ')).toBe('Trimmed');
    });

    it('should return untitled for empty input', () => {
      expect(slugify('')).toBe('untitled');
      expect(slugify('   ')).toBe('untitled');
    });
  });

  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
      expect(capitalize('WORLD')).toBe('WORLD');
    });

    it('should handle empty string', () => {
      expect(capitalize('')).toBe('');
    });

    it('should handle single character', () => {
      expect(capitalize('a')).toBe('A');
    });
  });
});
