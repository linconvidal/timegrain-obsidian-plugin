// ============================================================================
// Time Constants
// ============================================================================

/** Default pomodoro duration in seconds (25 minutes) */
export const POMODORO_DURATION_SECONDS = 25 * 60;

/** Default pomodoro duration in milliseconds */
export const POMODORO_DURATION_MS = POMODORO_DURATION_SECONDS * 1000;

/** One minute in milliseconds */
export const MINUTE_MS = 60 * 1000;

/** One hour in milliseconds */
export const HOUR_MS = 60 * MINUTE_MS;

/** One day in milliseconds */
export const DAY_MS = 24 * HOUR_MS;

// ============================================================================
// Energy Constants
// ============================================================================

export const MIN_ENERGY_LEVEL = 1;
export const MAX_ENERGY_LEVEL = 5;
export const DEFAULT_ENERGY_HIGH_THRESHOLD = 4;
export const DEFAULT_ENERGY_LOW_THRESHOLD = 2;

// ============================================================================
// UI Constants
// ============================================================================

/** Refresh interval for session stats in milliseconds */
export const SESSION_STATS_REFRESH_INTERVAL = 30 * 1000;

/** Timer tick interval in milliseconds */
export const TIMER_TICK_INTERVAL = 1000;

/** State persistence interval in milliseconds */
export const STATE_PERSISTENCE_INTERVAL = 5 * 1000;

// ============================================================================
// View Type Constants
// ============================================================================

export const VIEW_TYPE_TIMER = 'timegrain-timer-view';
export const VIEW_TYPE_DASHBOARD = 'timegrain-dashboard-view';
export const VIEW_TYPE_TASK_LIST = 'timegrain-task-list-view';

// ============================================================================
// Default Settings
// ============================================================================

export const DEFAULT_TIMER_SESSIONS_DIR = 'timer_sessions';
export const DEFAULT_TASK_DIRECTORY = 'tasks';
export const DEFAULT_DAILY_GOAL_POMS = 8;
export const DEFAULT_FOCUS_HORIZON_DAYS = 30;

// ============================================================================
// Day Names
// ============================================================================

export const DAY_NAMES = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

export type DayName = (typeof DAY_NAMES)[number];
