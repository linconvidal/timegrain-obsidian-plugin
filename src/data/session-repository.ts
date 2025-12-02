import { App, TFile, TFolder } from 'obsidian';
import type {
  Session,
  SessionFrontmatter,
  ActiveSession,
  SessionAction,
  TimegrainSettings,
  Feeling,
} from '../types';
import {
  readFrontmatter,
  updateFrontmatter,
  createFileWithFrontmatter,
  safeInt,
  safeString,
} from './frontmatter';
import {
  parseDateTime,
  formatDateTimeISO,
  formatSessionFilename,
  getDayName,
} from '../utils/datetime';
import { extractTaskName, createWikilink, calculatePomodoros } from '../utils/formatters';
import { POMODORO_DURATION_MS } from '../constants';

/**
 * Repository for timer session file operations
 */
export class SessionRepository {
  constructor(
    private app: App,
    private settings: TimegrainSettings
  ) {}

  /**
   * Get the timer sessions directory path
   */
  get timerDir(): string {
    return this.settings.timerSessionsDir;
  }

  /**
   * Ensure the timer sessions directory exists
   */
  async ensureTimerDir(): Promise<TFolder> {
    const existing = this.app.vault.getAbstractFileByPath(this.timerDir);
    if (existing instanceof TFolder) {
      return existing;
    }

    await this.app.vault.createFolder(this.timerDir);
    return this.app.vault.getAbstractFileByPath(this.timerDir) as TFolder;
  }

  /**
   * Create a new session file
   */
  async createSession(taskName: string, startTime: Date = new Date()): Promise<TFile> {
    await this.ensureTimerDir();

    const filename = formatSessionFilename(startTime);
    const filePath = `${this.timerDir}/${filename}.md`;

    const frontmatter: SessionFrontmatter = {
      started: formatDateTimeISO(startTime),
      ended: null,
      task: createWikilink(taskName),
    };

    return await createFileWithFrontmatter(this.app, filePath, frontmatter);
  }

  /**
   * Complete a session with an action
   */
  async completeSession(
    sessionFile: TFile,
    action: SessionAction,
    startTime: Date,
    endTime: Date = new Date()
  ): Promise<void> {
    await updateFrontmatter<SessionFrontmatter>(this.app, sessionFile, {
      ended: formatDateTimeISO(endTime),
      action,
      hour_of_day: startTime.getHours(),
      day_of_week: getDayName(startTime),
    });
  }

  /**
   * Record energy level for a session (legacy)
   */
  async recordEnergy(sessionFile: TFile, energyLevel: number): Promise<void> {
    await updateFrontmatter<SessionFrontmatter>(this.app, sessionFile, {
      energy_level: energyLevel,
    });
  }

  /**
   * Record feeling and perceived effort for a session
   */
  async recordPostSession(
    sessionFile: TFile,
    feeling: Feeling,
    perceivedEffort: number
  ): Promise<void> {
    await updateFrontmatter<SessionFrontmatter>(this.app, sessionFile, {
      feeling,
      perceived_effort: perceivedEffort,
    });
  }

  /**
   * Mark a session as abandoned
   */
  async abandonSession(sessionFile: TFile): Promise<void> {
    await updateFrontmatter<SessionFrontmatter>(this.app, sessionFile, {
      abandoned: true,
      ended: formatDateTimeISO(new Date()),
    });
  }

  /**
   * Mark a session as resumed
   */
  async markSessionResumed(sessionFile: TFile): Promise<void> {
    await updateFrontmatter<SessionFrontmatter>(this.app, sessionFile, {
      resumed: true,
    });
  }

  /**
   * Delete a session file (for cancel)
   */
  async deleteSession(sessionFile: TFile): Promise<void> {
    await this.app.vault.delete(sessionFile);
  }

  /**
   * Get all session files
   */
  getSessionFiles(): TFile[] {
    const folder = this.app.vault.getAbstractFileByPath(this.timerDir);
    if (!(folder instanceof TFolder)) {
      return [];
    }

    return folder.children.filter(
      (child): child is TFile => child instanceof TFile && child.extension === 'md'
    );
  }

  /**
   * Find all active (unfinished) sessions
   */
  async findActiveSessions(): Promise<ActiveSession[]> {
    const sessionFiles = this.getSessionFiles();
    const activeSessions: ActiveSession[] = [];

    for (const file of sessionFiles) {
      const fm = await readFrontmatter<SessionFrontmatter>(this.app, file);
      if (!fm?.started || fm.ended || fm.abandoned) {
        continue;
      }

      try {
        const started = parseDateTime(fm.started);
        const elapsed = Date.now() - started.getTime();

        activeSessions.push({
          filePath: file.path,
          taskName: extractTaskName(safeString(fm.task)),
          startTime: started,
          elapsedSeconds: Math.floor(elapsed / 1000),
          elapsedMinutes: Math.floor(elapsed / 60000),
          file,
        });
      } catch {
        continue;
      }
    }

    // Sort by start time, most recent first
    return activeSessions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  /**
   * Find the most recent unfinished session
   */
  async findLatestUnfinishedSession(): Promise<{
    file: TFile;
    frontmatter: SessionFrontmatter;
  } | null> {
    const activeSessions = await this.findActiveSessions();
    if (activeSessions.length === 0) {
      return null;
    }

    const latest = activeSessions[0];
    const frontmatter = await readFrontmatter<SessionFrontmatter>(this.app, latest.file);
    if (!frontmatter) {
      return null;
    }

    return { file: latest.file, frontmatter };
  }

  /**
   * Get all completed sessions
   */
  async getAllSessions(): Promise<Session[]> {
    const sessionFiles = this.getSessionFiles();
    const sessions: Session[] = [];

    for (const file of sessionFiles) {
      const fm = await readFrontmatter<SessionFrontmatter>(this.app, file);
      if (!fm?.started) continue;

      try {
        const started = parseDateTime(fm.started);
        const ended = fm.ended ? parseDateTime(fm.ended) : undefined;
        const taskName = extractTaskName(safeString(fm.task));

        let durationMs: number | undefined;
        let durationMinutes: number | undefined;
        let pomodoros: number | undefined;

        if (ended) {
          durationMs = ended.getTime() - started.getTime();
          durationMinutes = Math.floor(durationMs / 60000);
          pomodoros = calculatePomodoros(durationMs);
        }

        sessions.push({
          filePath: file.path,
          started,
          ended,
          taskName,
          taskLink: safeString(fm.task),
          energyLevel: fm.energy_level != null ? safeInt(fm.energy_level) : undefined,
          feeling: fm.feeling,
          perceivedEffort: fm.perceived_effort != null ? safeInt(fm.perceived_effort) : undefined,
          hourOfDay: fm.hour_of_day != null ? safeInt(fm.hour_of_day) : undefined,
          dayOfWeek: fm.day_of_week,
          durationMs,
          durationMinutes,
          pomodoros,
          action: fm.action,
          status: fm.status,
          abandoned: fm.abandoned,
          resumed: fm.resumed,
          file,
        });
      } catch {
        continue;
      }
    }

    // Sort by start time, most recent first
    return sessions.sort((a, b) => b.started.getTime() - a.started.getTime());
  }

  /**
   * Get sessions for a specific date range
   */
  async getSessionsInRange(startDate: Date, endDate: Date): Promise<Session[]> {
    const allSessions = await this.getAllSessions();
    return allSessions.filter(
      (s) => s.started >= startDate && s.started <= endDate
    );
  }

  /**
   * Get sessions for today
   */
  async getTodaySessions(): Promise<Session[]> {
    return this.getSessionsForDate(new Date());
  }

  /**
   * Get sessions for a specific date
   */
  async getSessionsForDate(date: Date): Promise<Session[]> {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    return this.getSessionsInRange(dayStart, dayEnd);
  }

  /**
   * Get completed pomodoros for today
   */
  async getTodayPomodoros(): Promise<number> {
    const sessions = await this.getTodaySessions();
    return sessions
      .filter((s) => s.ended && !s.abandoned)
      .reduce((sum, s) => sum + (s.pomodoros || 0), 0);
  }

  /**
   * Get session statistics grouped by task
   */
  async getSessionStatsByTask(): Promise<
    Record<string, { actualPoms: number; totalMinutes: number; sessions: Session[] }>
  > {
    const sessions = await this.getAllSessions();
    const stats: Record<
      string,
      { actualPoms: number; totalMinutes: number; sessions: Session[] }
    > = {};

    for (const session of sessions) {
      if (!session.ended || session.abandoned) continue;

      const taskName = session.taskName;
      if (!stats[taskName]) {
        stats[taskName] = { actualPoms: 0, totalMinutes: 0, sessions: [] };
      }

      stats[taskName].actualPoms += session.pomodoros || 0;
      stats[taskName].totalMinutes += session.durationMinutes || 0;
      stats[taskName].sessions.push(session);
    }

    return stats;
  }

  /**
   * Get daily pomodoro counts
   */
  async getDailyPomodorosCounts(): Promise<Record<string, number>> {
    const sessions = await this.getAllSessions();
    const daily: Record<string, number> = {};

    for (const session of sessions) {
      if (!session.ended || session.abandoned) continue;

      const dayKey = session.started.toISOString().slice(0, 10);
      daily[dayKey] = (daily[dayKey] || 0) + (session.pomodoros || 0);
    }

    return daily;
  }
}
