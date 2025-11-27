import { TFile, Events } from 'obsidian';
import type { TimerState, TimerStatus, SessionAction } from '../types';
import { SessionRepository } from '../data/session-repository';
import { POMODORO_DURATION_MS } from '../constants';

export interface TimerEvents {
  'timer-start': { taskName: string; taskPath: string | null };
  'timer-pause': undefined;
  'timer-resume': undefined;
  'timer-complete': { action: SessionAction; sessionFile: TFile };
  'timer-stop': undefined;
  'timer-tick': TimerStatus;
  'pomodoro-complete': { count: number };
}

/**
 * Service for managing timer state and lifecycle
 */
export class TimerService extends Events {
  private state: TimerState = 'idle';
  private taskName: string | null = null;
  private taskPath: string | null = null;
  private sessionFile: TFile | null = null;
  private startTime: number | null = null;
  private pausedAt: number | null = null;
  private totalPausedMs = 0;
  private currentPomodoro = 0;
  private lastPomodoroNotified = 0;
  private pomodoroDurationMs: number;

  constructor(
    private sessionRepository: SessionRepository,
    pomodoroDurationMs: number = POMODORO_DURATION_MS
  ) {
    super();
    // Validate and clamp pomodoro duration to reasonable bounds (1 min to 2 hours)
    this.pomodoroDurationMs = Math.max(60000, Math.min(7200000, pomodoroDurationMs || POMODORO_DURATION_MS));
  }

  // ============================================================================
  // State Getters
  // ============================================================================

  getState(): TimerState {
    return this.state;
  }

  isRunning(): boolean {
    return this.state === 'running';
  }

  isPaused(): boolean {
    return this.state === 'paused';
  }

  isIdle(): boolean {
    return this.state === 'idle';
  }

  getStatus(): TimerStatus {
    return {
      state: this.state,
      taskName: this.taskName,
      taskPath: this.taskPath,
      sessionFilePath: this.sessionFile?.path || null,
      startTime: this.startTime,
      pausedAt: this.pausedAt,
      totalPausedMs: this.totalPausedMs,
      elapsedSeconds: this.getElapsedSeconds(),
      currentPomodoro: this.currentPomodoro,
    };
  }

  getElapsedMs(): number {
    if (!this.startTime) return 0;

    if (this.pausedAt) {
      return this.pausedAt - this.startTime - this.totalPausedMs;
    }

    return Date.now() - this.startTime - this.totalPausedMs;
  }

  getElapsedSeconds(): number {
    return Math.floor(this.getElapsedMs() / 1000);
  }

  getCurrentPomodoro(): number {
    return Math.floor(this.getElapsedMs() / this.pomodoroDurationMs) + 1;
  }

  // ============================================================================
  // Timer Controls
  // ============================================================================

  /**
   * Start a new timer session
   */
  async start(taskName: string, taskPath: string | null = null): Promise<void> {
    if (this.state !== 'idle') {
      throw new Error('Timer is already running');
    }

    // Create session file
    const startTime = new Date();
    this.sessionFile = await this.sessionRepository.createSession(taskName, startTime);

    // Initialize state
    this.state = 'running';
    this.taskName = taskName;
    this.taskPath = taskPath;
    this.startTime = startTime.getTime();
    this.pausedAt = null;
    this.totalPausedMs = 0;
    this.currentPomodoro = 1;
    this.lastPomodoroNotified = 0;

    this.trigger('timer-start', { taskName, taskPath });
  }

  /**
   * Pause the timer
   */
  pause(): void {
    if (this.state !== 'running') {
      throw new Error('Timer is not running');
    }

    this.state = 'paused';
    this.pausedAt = Date.now();

    this.trigger('timer-pause');
  }

  /**
   * Resume the timer
   */
  resume(): void {
    if (this.state !== 'paused') {
      throw new Error('Timer is not paused');
    }

    if (this.pausedAt) {
      this.totalPausedMs += Date.now() - this.pausedAt;
    }

    this.state = 'running';
    this.pausedAt = null;

    this.trigger('timer-resume');
  }

  /**
   * Toggle pause/resume
   */
  togglePause(): void {
    if (this.state === 'running') {
      this.pause();
    } else if (this.state === 'paused') {
      this.resume();
    }
  }

  /**
   * Complete the session
   */
  async complete(): Promise<TFile | null> {
    if (this.state !== 'running' && this.state !== 'paused') {
      return null;
    }

    const sessionFile = this.sessionFile;
    const startTime = this.startTime;

    // Reset state first to ensure UI updates even if save fails
    this.reset();

    if (sessionFile && startTime) {
      try {
        await this.sessionRepository.completeSession(sessionFile, 'complete', new Date(startTime));
      } catch (e) {
        console.error('Failed to save session on complete:', e);
      }
      this.trigger('timer-complete', { action: 'complete', sessionFile });
    }

    return sessionFile;
  }

  /**
   * Stop the session without completing
   */
  async stop(): Promise<TFile | null> {
    if (this.state !== 'running' && this.state !== 'paused') {
      return null;
    }

    const sessionFile = this.sessionFile;
    const startTime = this.startTime;

    // Reset state first to ensure UI updates even if save fails
    this.reset();

    if (sessionFile && startTime) {
      try {
        await this.sessionRepository.completeSession(sessionFile, 'stop', new Date(startTime));
      } catch (e) {
        console.error('Failed to save session on stop:', e);
      }
      this.trigger('timer-stop');
    }

    return sessionFile;
  }

  /**
   * Reset the timer to idle state
   */
  private reset(): void {
    this.state = 'idle';
    this.taskName = null;
    this.taskPath = null;
    this.sessionFile = null;
    this.startTime = null;
    this.pausedAt = null;
    this.totalPausedMs = 0;
    this.currentPomodoro = 0;
    this.lastPomodoroNotified = 0;
  }

  // ============================================================================
  // Timer Tick
  // ============================================================================

  /**
   * Called every second to update timer state
   */
  tick(): void {
    if (this.state !== 'running') return;

    // Check for pomodoro completion BEFORE getting status
    // so that the status has the correct currentPomodoro value
    const completedPoms = Math.floor(this.getElapsedMs() / this.pomodoroDurationMs);
    const pomodoroJustCompleted = completedPoms > 0 && completedPoms > this.lastPomodoroNotified;

    if (pomodoroJustCompleted) {
      this.lastPomodoroNotified = completedPoms;
      this.currentPomodoro = completedPoms + 1; // Current pom is the one in progress
    }

    // Now get status with updated currentPomodoro
    const status = this.getStatus();
    this.trigger('timer-tick', status);

    // Notify pomodoro completion after tick so UI updates first
    if (pomodoroJustCompleted) {
      this.trigger('pomodoro-complete', { count: completedPoms });
    }
  }

  // ============================================================================
  // Session Recovery
  // ============================================================================

  /**
   * Restore timer from an unfinished session
   */
  async restoreFromSession(
    sessionFile: TFile,
    taskName: string,
    startTime: Date,
    taskPath: string | null = null
  ): Promise<void> {
    if (this.state !== 'idle') {
      throw new Error('Timer is already running');
    }

    // Mark session as resumed
    await this.sessionRepository.markSessionResumed(sessionFile);

    // Restore state
    this.state = 'running';
    this.taskName = taskName;
    this.taskPath = taskPath;
    this.sessionFile = sessionFile;
    this.startTime = startTime.getTime();
    this.pausedAt = null;
    this.totalPausedMs = 0;
    this.currentPomodoro = this.getCurrentPomodoro();
    this.lastPomodoroNotified = this.currentPomodoro - 1;

    this.trigger('timer-start', { taskName, taskPath });
  }

  /**
   * Abandon an unfinished session
   */
  async abandonSession(sessionFile: TFile): Promise<void> {
    await this.sessionRepository.abandonSession(sessionFile);
  }

  // ============================================================================
  // Persistence
  // ============================================================================

  /**
   * Get state for persistence
   */
  getPersistedState(): {
    isActive: boolean;
    taskName: string | null;
    taskPath: string | null;
    sessionFilePath: string | null;
    startTime: number | null;
    pausedAt: number | null;
    totalPausedMs: number;
  } {
    return {
      isActive: this.state !== 'idle',
      taskName: this.taskName,
      taskPath: this.taskPath,
      sessionFilePath: this.sessionFile?.path || null,
      startTime: this.startTime,
      pausedAt: this.pausedAt,
      totalPausedMs: this.totalPausedMs,
    };
  }
}
