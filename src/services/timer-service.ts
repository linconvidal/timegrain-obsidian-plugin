import { TFile, Events } from 'obsidian';
import type { TimerState, TimerStatus, SessionAction } from '../types';
import { SessionRepository } from '../data/session-repository';
import { POMODORO_DURATION_MS } from '../constants';

export interface TimerEvents {
  'timer-start': { taskName: string; taskPath: string | null };
  'timer-pause': undefined;
  'timer-resume': undefined;
  'timer-complete': { action: SessionAction; sessionFile: TFile };
  'timer-cancel': undefined;
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
  private accumulatedMs = 0; // Time from previous sessions in this work block
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
      accumulatedMs: this.accumulatedMs,
      elapsedSeconds: this.getElapsedSeconds(),
      currentPomodoro: this.currentPomodoro,
    };
  }

  getElapsedMs(): number {
    // When paused: only accumulated time (no active session)
    if (this.state === 'paused') {
      return this.accumulatedMs;
    }

    // When running: accumulated + current session
    if (this.startTime) {
      return this.accumulatedMs + (Date.now() - this.startTime);
    }

    return this.accumulatedMs;
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
    this.accumulatedMs = 0;
    this.currentPomodoro = 1;
    this.lastPomodoroNotified = 0;

    this.trigger('timer-start', { taskName, taskPath });
  }

  /**
   * Pause the timer - completes current session
   */
  async pause(): Promise<TFile | null> {
    if (this.state !== 'running') {
      throw new Error('Timer is not running');
    }

    // Save current session time to accumulated
    if (this.startTime) {
      this.accumulatedMs += Date.now() - this.startTime;
    }

    // Complete the current session with action 'pause'
    const sessionFile = this.sessionFile;
    if (sessionFile && this.startTime) {
      try {
        await this.sessionRepository.completeSession(sessionFile, 'pause', new Date(this.startTime));
      } catch (e) {
        console.error('Failed to save session on pause:', e);
      }
    }

    this.state = 'paused';
    this.sessionFile = null;
    this.startTime = null;

    this.trigger('timer-pause');
    return sessionFile;
  }

  /**
   * Resume the timer - creates a new session
   */
  async resume(): Promise<void> {
    if (this.state !== 'paused') {
      throw new Error('Timer is not paused');
    }

    // Create new session file
    this.sessionFile = await this.sessionRepository.createSession(this.taskName!, new Date());
    this.startTime = Date.now();
    this.state = 'running';

    this.trigger('timer-resume');
  }

  /**
   * Toggle pause/resume
   */
  async togglePause(): Promise<void> {
    if (this.state === 'running') {
      await this.pause();
    } else if (this.state === 'paused') {
      await this.resume();
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
   * Cancel the session - discard without logging
   */
  async cancel(): Promise<void> {
    if (this.state !== 'running' && this.state !== 'paused') {
      return;
    }

    const sessionFile = this.sessionFile;

    // Reset state first
    this.reset();

    // Delete the session file - we're discarding this session
    if (sessionFile) {
      try {
        await this.sessionRepository.deleteSession(sessionFile);
      } catch (e) {
        console.error('Failed to delete session file on cancel:', e);
      }
      this.trigger('timer-cancel');
    }
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
    this.accumulatedMs = 0;
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

    // Restore state (crash recovery - continue existing session)
    this.state = 'running';
    this.taskName = taskName;
    this.taskPath = taskPath;
    this.sessionFile = sessionFile;
    this.startTime = startTime.getTime();
    this.accumulatedMs = 0; // Crash recovery starts fresh for this session
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
    state: TimerState;
    taskName: string | null;
    taskPath: string | null;
    sessionFilePath: string | null;
    startTime: number | null;
    accumulatedMs: number;
  } {
    return {
      isActive: this.state !== 'idle',
      state: this.state,
      taskName: this.taskName,
      taskPath: this.taskPath,
      sessionFilePath: this.sessionFile?.path || null,
      startTime: this.startTime,
      accumulatedMs: this.accumulatedMs,
    };
  }
}
