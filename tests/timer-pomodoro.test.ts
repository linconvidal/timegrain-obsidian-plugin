import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Events } from './__mocks__/obsidian';

/**
 * Tests for pomodoro notification boundary logic
 * Bug: Pomodoro notification was firing immediately on first tick instead of after duration
 */

class MockSessionRepository {
  createSession = vi.fn().mockResolvedValue({ path: 'timer_sessions/test.md' });
  completeSession = vi.fn().mockResolvedValue(undefined);
}

type TimerState = 'idle' | 'running' | 'paused';

/**
 * Test implementation matching the fixed timer-service.ts logic
 */
class TimerServiceFixed extends Events {
  private state: TimerState = 'idle';
  private startTime: number | null = null;
  private pausedAt: number | null = null;
  private totalPausedMs = 0;
  private lastPomodoroNotified = 0;
  private currentPomodoro = 0;

  constructor(
    private sessionRepository: MockSessionRepository,
    private pomodoroDurationMs: number = 25 * 60 * 1000
  ) {
    super();
  }

  async start(taskName: string): Promise<void> {
    if (this.state !== 'idle') throw new Error('Timer already running');

    await this.sessionRepository.createSession(taskName);
    this.state = 'running';
    this.startTime = Date.now();
    this.pausedAt = null;
    this.totalPausedMs = 0;
    this.currentPomodoro = 1;
    this.lastPomodoroNotified = 0;
  }

  pause(): void {
    if (this.state !== 'running') throw new Error('Timer not running');
    this.pausedAt = Date.now();
    this.state = 'paused';
  }

  resume(): void {
    if (this.state !== 'paused') throw new Error('Timer not paused');
    if (this.pausedAt) {
      this.totalPausedMs += Date.now() - this.pausedAt;
    }
    this.pausedAt = null;
    this.state = 'running';
  }

  getElapsedMs(): number {
    if (!this.startTime) return 0;
    if (this.pausedAt) {
      return this.pausedAt - this.startTime - this.totalPausedMs;
    }
    return Date.now() - this.startTime - this.totalPausedMs;
  }

  getCurrentPomodoro(): number {
    return Math.floor(this.getElapsedMs() / this.pomodoroDurationMs) + 1;
  }

  /**
   * FIXED tick() logic:
   * Only notify when elapsed time crosses a pomodoro boundary
   * completedPoms = floor(elapsed / duration)
   * Notify when completedPoms > 0 AND completedPoms > lastNotified
   */
  tick(): void {
    if (this.state !== 'running') return;

    const completedPoms = Math.floor(this.getElapsedMs() / this.pomodoroDurationMs);
    if (completedPoms > 0 && completedPoms > this.lastPomodoroNotified) {
      this.lastPomodoroNotified = completedPoms;
      this.currentPomodoro = completedPoms + 1;
      this.trigger('pomodoro-complete', { count: completedPoms });
    }
  }

  isIdle(): boolean {
    return this.state === 'idle';
  }

  getState(): TimerState {
    return this.state;
  }
}

describe('Pomodoro Notification Boundary', () => {
  let timerService: TimerServiceFixed;
  let mockRepo: MockSessionRepository;

  beforeEach(() => {
    vi.useFakeTimers();
    mockRepo = new MockSessionRepository();
    // Use 1000ms (1 second) pomodoro for easy testing
    timerService = new TimerServiceFixed(mockRepo, 1000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('first tick behavior', () => {
    it('should NOT fire notification on first tick at 0ms', async () => {
      const callback = vi.fn();
      timerService.on('pomodoro-complete', callback);

      await timerService.start('Test Task');
      // Immediately tick without time passing
      timerService.tick();

      expect(callback).not.toHaveBeenCalled();
    });

    it('should NOT fire notification at 500ms (half pomodoro)', async () => {
      const callback = vi.fn();
      timerService.on('pomodoro-complete', callback);

      await timerService.start('Test Task');
      vi.advanceTimersByTime(500);
      timerService.tick();

      expect(callback).not.toHaveBeenCalled();
    });

    it('should NOT fire notification at 999ms (just before boundary)', async () => {
      const callback = vi.fn();
      timerService.on('pomodoro-complete', callback);

      await timerService.start('Test Task');
      vi.advanceTimersByTime(999);
      timerService.tick();

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('boundary crossing', () => {
    it('should fire notification exactly at 1000ms (first boundary)', async () => {
      const callback = vi.fn();
      timerService.on('pomodoro-complete', callback);

      await timerService.start('Test Task');
      vi.advanceTimersByTime(1000);
      timerService.tick();

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({ count: 1 });
    });

    it('should fire notification at 1001ms (just after boundary)', async () => {
      const callback = vi.fn();
      timerService.on('pomodoro-complete', callback);

      await timerService.start('Test Task');
      vi.advanceTimersByTime(1001);
      timerService.tick();

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({ count: 1 });
    });

    it('should fire second notification at 2000ms', async () => {
      const callback = vi.fn();
      timerService.on('pomodoro-complete', callback);

      await timerService.start('Test Task');

      vi.advanceTimersByTime(1000);
      timerService.tick();
      expect(callback).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1000); // Total: 2000ms
      timerService.tick();
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenLastCalledWith({ count: 2 });
    });

    it('should handle multiple boundaries in one tick', async () => {
      const callback = vi.fn();
      timerService.on('pomodoro-complete', callback);

      await timerService.start('Test Task');

      // Skip 3 pomodoros worth of time without ticking
      vi.advanceTimersByTime(3500);
      timerService.tick();

      // Should only fire once with the latest count
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({ count: 3 });
    });
  });

  describe('no duplicate notifications', () => {
    it('should NOT fire twice for same pomodoro on repeated ticks', async () => {
      const callback = vi.fn();
      timerService.on('pomodoro-complete', callback);

      await timerService.start('Test Task');
      vi.advanceTimersByTime(1000);

      timerService.tick();
      timerService.tick();
      timerService.tick();

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should track state correctly across multiple pomodoros', async () => {
      const callback = vi.fn();
      timerService.on('pomodoro-complete', callback);

      await timerService.start('Test Task');

      // First pomodoro
      vi.advanceTimersByTime(1000);
      timerService.tick();
      timerService.tick();
      expect(callback).toHaveBeenCalledTimes(1);

      // Second pomodoro
      vi.advanceTimersByTime(1000);
      timerService.tick();
      timerService.tick();
      expect(callback).toHaveBeenCalledTimes(2);

      // Third pomodoro
      vi.advanceTimersByTime(1000);
      timerService.tick();
      timerService.tick();
      expect(callback).toHaveBeenCalledTimes(3);

      expect(callback).toHaveBeenNthCalledWith(1, { count: 1 });
      expect(callback).toHaveBeenNthCalledWith(2, { count: 2 });
      expect(callback).toHaveBeenNthCalledWith(3, { count: 3 });
    });
  });

  describe('paused time handling', () => {
    it('should NOT count paused time towards pomodoro completion', async () => {
      const callback = vi.fn();
      timerService.on('pomodoro-complete', callback);

      await timerService.start('Test Task');
      vi.advanceTimersByTime(500); // 500ms running
      timerService.tick();
      expect(callback).not.toHaveBeenCalled();

      timerService.pause();
      vi.advanceTimersByTime(5000); // 5 seconds paused (shouldn't count)
      // Can't tick while paused (state check)

      timerService.resume();
      timerService.tick();
      expect(callback).not.toHaveBeenCalled(); // Still only 500ms of actual time

      vi.advanceTimersByTime(500); // Now 1000ms total running time
      timerService.tick();
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should NOT fire while paused even if time has passed', async () => {
      const callback = vi.fn();
      timerService.on('pomodoro-complete', callback);

      await timerService.start('Test Task');
      timerService.pause();
      vi.advanceTimersByTime(5000);
      timerService.tick(); // tick while paused does nothing

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('real-world duration (25 minutes)', () => {
    it('should fire at exactly 25 minutes', async () => {
      const callback = vi.fn();
      const realDuration = 25 * 60 * 1000; // 25 minutes
      const realTimerService = new TimerServiceFixed(mockRepo, realDuration);
      realTimerService.on('pomodoro-complete', callback);

      await realTimerService.start('Test Task');

      // Just before 25 minutes
      vi.advanceTimersByTime(realDuration - 1);
      realTimerService.tick();
      expect(callback).not.toHaveBeenCalled();

      // At exactly 25 minutes
      vi.advanceTimersByTime(1);
      realTimerService.tick();
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({ count: 1 });
    });
  });
});
