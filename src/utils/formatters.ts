import { POMODORO_DURATION_MS } from '../constants';

/**
 * Format milliseconds as HH:MM:SS or MM:SS
 */
export function formatDuration(ms: number, includeHours = false): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  if (includeHours || hours > 0) {
    const hh = String(hours).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }

  return `${mm}:${ss}`;
}

/**
 * Format seconds as HH:MM:SS or MM:SS
 */
export function formatSeconds(seconds: number, includeHours = false): string {
  return formatDuration(seconds * 1000, includeHours);
}

/**
 * Format duration in human readable form
 * e.g., "1h 23m", "45m", "2h"
 */
export function formatDurationHuman(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${minutes}m`;
  }
}

/**
 * Calculate number of completed pomodoros from milliseconds
 * Uses floor to match timer-service behavior (only count fully completed poms)
 */
export function calculatePomodoros(durationMs: number): number {
  return Math.floor(durationMs / POMODORO_DURATION_MS);
}

/**
 * Format pomodoro count
 */
export function formatPomodoros(count: number): string {
  return count === 1 ? '1 pom' : `${count} poms`;
}

/**
 * Format progress as percentage
 */
export function formatPercent(value: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

/**
 * Create a simple text-based progress bar
 */
export function createProgressBar(value: number, total: number, width = 10): string {
  if (total === 0) return '░'.repeat(width);

  const percent = Math.min(value / total, 1);
  const filled = Math.round(percent * width);
  const empty = width - filled;

  return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Format energy level with visual indicator
 */
export function formatEnergyLevel(level: number): string {
  // Clamp to valid range 0-5 to prevent repeat() with negative values
  const clamped = Math.max(0, Math.min(5, Math.floor(level)));
  const filled = '●'.repeat(clamped);
  const empty = '○'.repeat(5 - clamped);
  return filled + empty;
}

/**
 * Format time of day (e.g., "2:30 PM")
 */
export function formatTimeOfDay(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format date (e.g., "Nov 26")
 */
export function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format relative date (e.g., "Today", "Yesterday", "Nov 26")
 */
export function formatRelativeDate(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (isSameDayHelper(date, today)) {
    return 'Today';
  } else if (isSameDayHelper(date, yesterday)) {
    return 'Yesterday';
  } else {
    return formatShortDate(date);
  }
}

function isSameDayHelper(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Capitalize first letter of a string
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Slugify text for filesystem-safe filenames
 * Matches flowtime's slugify()
 */
export function slugify(text: string): string {
  if (!text || !text.trim()) {
    return 'untitled';
  }

  // Remove forbidden characters: \ / : * ? " < > |
  let result = text.replace(/[\\/:*?"<>|]/g, '');

  // Collapse multiple spaces
  result = result.replace(/\s+/g, ' ');

  // Trim
  result = result.trim();

  return result || 'untitled';
}

/**
 * Extract task name from wikilink format
 * "[[Task Name]]" -> "Task Name"
 */
export function extractTaskName(taskField: string): string {
  if (taskField.startsWith('[[') && taskField.endsWith(']]')) {
    return taskField.slice(2, -2);
  }
  return taskField;
}

/**
 * Create wikilink format
 * "Task Name" -> "[[Task Name]]"
 */
export function createWikilink(taskName: string): string {
  return `[[${taskName}]]`;
}
