import { App, TFile } from 'obsidian';
import type TimegrainPlugin from './main';

// ============================================================================
// Task Types
// ============================================================================

export type TaskStatus =
  | 'today'
  | 'in progress'
  | 'this week'
  | 'this month'
  | 'backlog'
  | 'not started'
  | 'done'
  | 'archived'
  | 'on hold'
  | 'needs review';

/**
 * Task frontmatter structure matching flowtime format
 * Keys with spaces are for flowtime compatibility
 */
export interface TaskFrontmatter {
  [key: string]: unknown;
  title?: string;
  status?: TaskStatus | string;
  estimation?: number;
  'expected energy'?: number;
  expected_energy?: number;
  category?: string;
  scope?: string;
  'creation date'?: string;
  creation_date?: string;
  'modification date'?: string;
  modification_date?: string;
  'due to'?: string;
  due_to?: string;
  tags?: string | string[];
  'depends on'?: string;
  depends_on?: string;
  goal?: string;
}

/**
 * Processed task with computed fields
 */
export interface Task {
  path: string;
  name: string;
  title: string;
  status: TaskStatus;
  estimation: number;
  actualPoms: number;
  expectedEnergy: number;
  area: string;
  category: string;
  scope: string;
  tags: string[];
  modificationDate: number;
  file: TFile;
}

export interface TaskMetadataOptions {
  categories: string[];
  scopes: string[];
  tags: string[];
}

// ============================================================================
// Session Types
// ============================================================================

export type SessionAction = 'complete' | 'pause';
export type SessionStatus = 'completed' | 'paused' | 'abandoned';

/**
 * Feeling options (Garmin-style)
 */
export type Feeling = 'very_weak' | 'weak' | 'normal' | 'strong' | 'very_strong';

/**
 * Session frontmatter structure matching flowtime format
 */
export interface SessionFrontmatter {
  [key: string]: unknown;
  started: string;
  ended?: string | null;
  task: string;
  energy_level?: number;
  feeling?: Feeling;
  perceived_effort?: number;
  hour_of_day?: number;
  day_of_week?: string;
  action?: SessionAction;
  status?: SessionStatus;
  abandoned?: boolean;
  resumed?: boolean;
}

/**
 * Processed session with computed fields
 */
export interface Session {
  filePath: string;
  started: Date;
  ended?: Date;
  taskName: string;
  taskLink: string;
  energyLevel?: number;
  feeling?: Feeling;
  perceivedEffort?: number;
  hourOfDay?: number;
  dayOfWeek?: string;
  durationMs?: number;
  durationMinutes?: number;
  pomodoros?: number;
  action?: SessionAction;
  status?: SessionStatus;
  abandoned?: boolean;
  resumed?: boolean;
  file: TFile;
}

/**
 * Active session (no ended timestamp)
 */
export interface ActiveSession {
  filePath: string;
  taskName: string;
  taskPath?: string;
  startTime: Date;
  elapsedSeconds: number;
  elapsedMinutes: number;
  file: TFile;
}

// ============================================================================
// Timer Types
// ============================================================================

export type TimerState = 'idle' | 'running' | 'paused' | 'completed';

export interface TimerStatus {
  state: TimerState;
  taskName: string | null;
  taskPath: string | null;
  sessionFilePath: string | null;
  startTime: number | null;
  accumulatedMs: number;
  elapsedSeconds: number;
  currentPomodoro: number;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface EnergyDataPoint {
  energy: number;
  hour: number;
  day: string;
  date: Date;
}

export interface EnergyInsights {
  peakHour?: number;
  peakEnergy?: number;
  lowHour?: number;
  lowEnergy?: number;
  bestDay?: string;
  bestDayEnergy?: number;
}

export interface SessionStats {
  actualPoms: number;
  totalMinutes: number;
  sessions: Session[];
}

export interface FocusArea {
  name: string;
  activeCount: number;
  completedPoms: number;
  estimatedPoms: number;
  effortPercent: number;
}

export interface WeeklyStats {
  days: Date[];
  pomsByDay: number[];
  weekTotal: number;
  weekAverage: number;
}

export interface ProcessedData {
  allTasks: Task[];
  tasksByStatus: Record<TaskStatus, Task[]>;
  dailyPoms: Record<string, number>;
  energyData: EnergyDataPoint[];
  allSessions: Session[];
  activeSessions: ActiveSession[];
  sessionStatsByTask: Record<string, SessionStats>;
  streak: number;
}

// ============================================================================
// Settings Types
// ============================================================================

export interface TimegrainSettings {
  // Paths
  timerSessionsDir: string;
  defaultTaskDirectory: string;

  // Timer
  cycleSeconds: number;
  playSound: boolean;

  // Goals
  dailyGoalPoms: number;

  // Energy
  energyHighThreshold: number;
  energyLowThreshold: number;

  // UI
  showStatusBar: boolean;
  statusBarClickAction: 'open-timer' | 'toggle-pause' | 'open-task';

  // Behavior
  rolloverStaleTasks: boolean;
  taskStatuses: TaskStatus[];
  completedStatuses: TaskStatus[];
  areaBlacklist: string[];
}

// ============================================================================
// Context Types
// ============================================================================

export interface PluginContextValue {
  plugin: TimegrainPlugin;
  app: App;
}
