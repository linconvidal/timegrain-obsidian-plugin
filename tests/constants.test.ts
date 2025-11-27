import { describe, it, expect } from 'vitest';
import {
  POMODORO_DURATION_MS,
  POMODORO_DURATION_SECONDS,
  TIMER_TICK_INTERVAL,
  STATE_PERSISTENCE_INTERVAL,
  VIEW_TYPE_TIMER,
  DEFAULT_DAILY_GOAL_POMS,
  DEFAULT_ENERGY_HIGH_THRESHOLD,
  DEFAULT_ENERGY_LOW_THRESHOLD,
  DAY_NAMES,
  MIN_ENERGY_LEVEL,
  MAX_ENERGY_LEVEL,
} from '../src/constants';

describe('constants', () => {
  describe('timer constants', () => {
    it('should have correct pomodoro duration', () => {
      expect(POMODORO_DURATION_SECONDS).toBe(25 * 60); // 25 minutes
      expect(POMODORO_DURATION_MS).toBe(25 * 60 * 1000);
    });

    it('should have reasonable tick interval', () => {
      expect(TIMER_TICK_INTERVAL).toBe(1000); // 1 second
    });

    it('should have state persistence interval', () => {
      expect(STATE_PERSISTENCE_INTERVAL).toBe(5000); // 5 seconds
    });
  });

  describe('view constants', () => {
    it('should have timer view type', () => {
      expect(VIEW_TYPE_TIMER).toBe('timegrain-timer-view');
    });
  });

  describe('default settings', () => {
    it('should have reasonable daily goal', () => {
      expect(DEFAULT_DAILY_GOAL_POMS).toBe(8);
    });

    it('should have valid energy thresholds', () => {
      expect(DEFAULT_ENERGY_HIGH_THRESHOLD).toBe(4);
      expect(DEFAULT_ENERGY_LOW_THRESHOLD).toBe(2);
      expect(DEFAULT_ENERGY_HIGH_THRESHOLD).toBeGreaterThan(DEFAULT_ENERGY_LOW_THRESHOLD);
    });

    it('should have energy level range', () => {
      expect(MIN_ENERGY_LEVEL).toBe(1);
      expect(MAX_ENERGY_LEVEL).toBe(5);
    });
  });

  describe('day names', () => {
    it('should have all 7 days', () => {
      expect(DAY_NAMES).toHaveLength(7);
    });

    it('should start with sunday', () => {
      expect(DAY_NAMES[0]).toBe('sunday');
    });

    it('should be lowercase', () => {
      DAY_NAMES.forEach((day) => {
        expect(day).toBe(day.toLowerCase());
      });
    });
  });
});
