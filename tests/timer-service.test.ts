import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Events } from './__mocks__/obsidian';

// Mock the timer service dependencies
class MockSessionRepository {
  createSession = vi.fn().mockResolvedValue({ path: 'timer_sessions/test.md' });
  completeSession = vi.fn().mockResolvedValue(undefined);
  abandonSession = vi.fn().mockResolvedValue(undefined);
}

// Recreate the essential TimerService logic for testing
type TimerState = 'idle' | 'running' | 'paused' | 'completed';

interface TimerStatus {
  state: TimerState;
  taskName: string | null;
  taskPath: string | null;
  sessionFilePath: string | null;
  startTime: number | null;
  pausedAt: number | null;
  totalPausedMs: number;
  elapsedSeconds: number;
  currentPomodoro: number;
}

class TimerService extends Events {
  private state: TimerState = 'idle';
  private taskName: string | null = null;
  private taskPath: string | null = null;
  private sessionFilePath: string | null = null;
  private startTime: number | null = null;
  private pausedAt: number | null = null;
  private totalPausedMs: number = 0;
  private lastPomodoroCount: number = 0;
  private pomodoroDurationMs: number;

  constructor(
    private sessionRepository: MockSessionRepository,
    pomodoroDurationMs: number = 25 * 60 * 1000
  ) {
    super();
    this.pomodoroDurationMs = pomodoroDurationMs;
  }

  async start(taskName: string, taskPath?: string): Promise<void> {
    if (this.state !== 'idle') {
      throw new Error('Timer already running');
    }

    const session = await this.sessionRepository.createSession(taskName, taskPath);
    this.taskName = taskName;
    this.taskPath = taskPath || null;
    this.sessionFilePath = session.path;
    this.startTime = Date.now();
    this.totalPausedMs = 0;
    this.lastPomodoroCount = 0;
    this.state = 'running';
    this.trigger('start', { taskName, taskPath });
  }

  pause(): void {
    if (this.state !== 'running') {
      throw new Error('Timer not running');
    }
    this.pausedAt = Date.now();
    this.state = 'paused';
    this.trigger('pause');
  }

  resume(): void {
    if (this.state !== 'paused') {
      throw new Error('Timer not paused');
    }
    if (this.pausedAt) {
      this.totalPausedMs += Date.now() - this.pausedAt;
    }
    this.pausedAt = null;
    this.state = 'running';
    this.trigger('resume');
  }

  togglePause(): void {
    if (this.state === 'running') {
      this.pause();
    } else if (this.state === 'paused') {
      this.resume();
    }
  }

  stop(): void {
    if (this.state === 'idle') {
      throw new Error('Timer not started');
    }
    this.reset();
    this.trigger('stop');
  }

  async complete(): Promise<{ path: string } | null> {
    if (this.state === 'idle') {
      throw new Error('Timer not started');
    }
    const session = { path: this.sessionFilePath! };
    await this.sessionRepository.completeSession(session, 'complete', new Date(this.startTime!));
    this.reset();
    this.trigger('complete');
    return session;
  }

  tick(): void {
    if (this.state !== 'running') return;

    const elapsed = this.getElapsedMs();
    const currentPom = Math.floor(elapsed / this.pomodoroDurationMs) + 1;

    if (currentPom > this.lastPomodoroCount) {
      this.lastPomodoroCount = currentPom;
      this.trigger('pomodoro-complete', { count: currentPom });
    }
  }

  getStatus(): TimerStatus {
    const elapsed = this.getElapsedMs();
    return {
      state: this.state,
      taskName: this.taskName,
      taskPath: this.taskPath,
      sessionFilePath: this.sessionFilePath,
      startTime: this.startTime,
      pausedAt: this.pausedAt,
      totalPausedMs: this.totalPausedMs,
      elapsedSeconds: Math.floor(elapsed / 1000),
      currentPomodoro: this.getCurrentPomodoro(),
    };
  }

  isIdle(): boolean {
    return this.state === 'idle';
  }

  private getElapsedMs(): number {
    if (!this.startTime) return 0;
    const now = this.pausedAt || Date.now();
    return now - this.startTime - this.totalPausedMs;
  }

  private getCurrentPomodoro(): number {
    if (this.state === 'idle') return 0;
    return Math.floor(this.getElapsedMs() / this.pomodoroDurationMs) + 1;
  }

  private reset(): void {
    this.state = 'idle';
    this.taskName = null;
    this.taskPath = null;
    this.sessionFilePath = null;
    this.startTime = null;
    this.pausedAt = null;
    this.totalPausedMs = 0;
    this.lastPomodoroCount = 0;
  }
}

describe('TimerService', () => {
  let timerService: TimerService;
  let mockRepo: MockSessionRepository;

  beforeEach(() => {
    vi.useFakeTimers();
    mockRepo = new MockSessionRepository();
    // Use 100ms pomodoro duration for easier testing
    timerService = new TimerService(mockRepo, 100);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('should start in idle state', () => {
      expect(timerService.isIdle()).toBe(true);
      expect(timerService.getStatus().state).toBe('idle');
    });

    it('should have null task info when idle', () => {
      const status = timerService.getStatus();
      expect(status.taskName).toBeNull();
      expect(status.taskPath).toBeNull();
      expect(status.elapsedSeconds).toBe(0);
    });
  });

  describe('start', () => {
    it('should transition to running state', async () => {
      await timerService.start('Test Task', 'path/to/task.md');
      expect(timerService.isIdle()).toBe(false);
      expect(timerService.getStatus().state).toBe('running');
    });

    it('should store task name and path', async () => {
      await timerService.start('Test Task', 'path/to/task.md');
      const status = timerService.getStatus();
      expect(status.taskName).toBe('Test Task');
      expect(status.taskPath).toBe('path/to/task.md');
    });

    it('should create a session', async () => {
      await timerService.start('Test Task', 'path/to/task.md');
      expect(mockRepo.createSession).toHaveBeenCalledWith('Test Task', 'path/to/task.md');
    });

    it('should trigger start event', async () => {
      const callback = vi.fn();
      timerService.on('start', callback);
      await timerService.start('Test Task');
      expect(callback).toHaveBeenCalled();
    });

    it('should throw if already running', async () => {
      await timerService.start('Test Task');
      await expect(timerService.start('Another Task')).rejects.toThrow('Timer already running');
    });
  });

  describe('pause/resume', () => {
    it('should transition to paused state', async () => {
      await timerService.start('Test Task');
      timerService.pause();
      expect(timerService.getStatus().state).toBe('paused');
    });

    it('should trigger pause event', async () => {
      const callback = vi.fn();
      timerService.on('pause', callback);
      await timerService.start('Test Task');
      timerService.pause();
      expect(callback).toHaveBeenCalled();
    });

    it('should resume to running state', async () => {
      await timerService.start('Test Task');
      timerService.pause();
      timerService.resume();
      expect(timerService.getStatus().state).toBe('running');
    });

    it('should trigger resume event', async () => {
      const callback = vi.fn();
      timerService.on('resume', callback);
      await timerService.start('Test Task');
      timerService.pause();
      timerService.resume();
      expect(callback).toHaveBeenCalled();
    });

    it('should track paused time correctly', async () => {
      await timerService.start('Test Task');
      vi.advanceTimersByTime(1000); // 1 second running

      timerService.pause();
      vi.advanceTimersByTime(2000); // 2 seconds paused (shouldn't count)

      timerService.resume();
      vi.advanceTimersByTime(1000); // 1 more second running

      const status = timerService.getStatus();
      expect(status.elapsedSeconds).toBe(2); // Only 2 seconds of running time
      expect(status.totalPausedMs).toBe(2000);
    });

    it('should throw if pausing when not running', () => {
      expect(() => timerService.pause()).toThrow('Timer not running');
    });

    it('should throw if resuming when not paused', async () => {
      await timerService.start('Test Task');
      expect(() => timerService.resume()).toThrow('Timer not paused');
    });

    it('should toggle between pause and resume', async () => {
      await timerService.start('Test Task');
      timerService.togglePause();
      expect(timerService.getStatus().state).toBe('paused');
      timerService.togglePause();
      expect(timerService.getStatus().state).toBe('running');
    });
  });

  describe('stop', () => {
    it('should reset to idle state', async () => {
      await timerService.start('Test Task');
      timerService.stop();
      expect(timerService.isIdle()).toBe(true);
    });

    it('should trigger stop event', async () => {
      const callback = vi.fn();
      timerService.on('stop', callback);
      await timerService.start('Test Task');
      timerService.stop();
      expect(callback).toHaveBeenCalled();
    });

    it('should throw if already idle', () => {
      expect(() => timerService.stop()).toThrow('Timer not started');
    });
  });

  describe('complete', () => {
    it('should reset to idle state', async () => {
      await timerService.start('Test Task');
      await timerService.complete();
      expect(timerService.isIdle()).toBe(true);
    });

    it('should return session file', async () => {
      await timerService.start('Test Task');
      const result = await timerService.complete();
      expect(result).toHaveProperty('path', 'timer_sessions/test.md');
    });

    it('should complete the session in repository', async () => {
      await timerService.start('Test Task');
      await timerService.complete();
      expect(mockRepo.completeSession).toHaveBeenCalled();
    });

    it('should trigger complete event', async () => {
      const callback = vi.fn();
      timerService.on('complete', callback);
      await timerService.start('Test Task');
      await timerService.complete();
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('pomodoro tracking', () => {
    it('should start at pomodoro 1', async () => {
      await timerService.start('Test Task');
      expect(timerService.getStatus().currentPomodoro).toBe(1);
    });

    it('should increment pomodoro after duration', async () => {
      await timerService.start('Test Task');
      vi.advanceTimersByTime(100); // Complete first pomodoro
      expect(timerService.getStatus().currentPomodoro).toBe(2);
    });

    it('should trigger pomodoro-complete event when pomodoro completes', async () => {
      const callback = vi.fn();
      timerService.on('pomodoro-complete', callback);

      await timerService.start('Test Task');
      // Starting triggers count 1 on first tick, so we need to wait for that
      timerService.tick();
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({ count: 1 });

      // Advance past first pomodoro
      vi.advanceTimersByTime(100);
      timerService.tick();
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledWith({ count: 2 });
    });

    it('should not trigger events when paused', async () => {
      const callback = vi.fn();
      timerService.on('pomodoro-complete', callback);

      await timerService.start('Test Task');
      timerService.pause();
      vi.advanceTimersByTime(200);
      timerService.tick();
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('elapsed time', () => {
    it('should track elapsed time', async () => {
      await timerService.start('Test Task');
      vi.advanceTimersByTime(5000);
      expect(timerService.getStatus().elapsedSeconds).toBe(5);
    });

    it('should not count paused time', async () => {
      await timerService.start('Test Task');
      vi.advanceTimersByTime(2000); // 2 seconds

      timerService.pause();
      vi.advanceTimersByTime(3000); // 3 seconds paused

      timerService.resume();
      vi.advanceTimersByTime(2000); // 2 more seconds

      expect(timerService.getStatus().elapsedSeconds).toBe(4); // 2 + 2
    });
  });
});
