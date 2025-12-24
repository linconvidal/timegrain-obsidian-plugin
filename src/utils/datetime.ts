import { DAY_NAMES, type DayName } from '../constants';

/**
 * Parse datetime from various string formats
 *
 * Supported formats:
 * - ISO 8601: "2025-01-15T14:30:00"
 * - Legacy: "2025-01-15 14:30:00"
 * - Date only: "2025-01-15"
 * - Time only: "14:30:00" or "14:30" (assumes today)
 */
export function parseDateTime(input: unknown): Date {
  if (input instanceof Date) {
    return input;
  }

  const str = String(input).trim();

  // Full ISO format (with T separator)
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/);
  if (isoMatch) {
    return new Date(str);
  }

  // Legacy format (with space separator)
  const legacyMatch = str.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  if (legacyMatch) {
    const [, year, month, day, hour, minute, second] = legacyMatch;
    return new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second)
    );
  }

  // Without seconds (with T or space)
  const noSecondsMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
  if (noSecondsMatch) {
    const [, year, month, day, hour, minute] = noSecondsMatch;
    return new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      0
    );
  }

  // Date only
  const dateOnlyMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  // Time only (assume today)
  const timeMatch = str.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (timeMatch) {
    const [, hour, minute, second] = timeMatch;
    const today = new Date();
    today.setHours(parseInt(hour), parseInt(minute), second ? parseInt(second) : 0, 0);
    return today;
  }

  throw new Error(`Unable to parse datetime: ${str}`);
}

/**
 * Format datetime to ISO 8601 string (without milliseconds and timezone)
 */
export function formatDateTimeISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

/**
 * Format date only (YYYY-MM-DD)
 */
export function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format datetime for task frontmatter (YYYY-MM-DD HH:MM)
 */
export function formatTaskDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

/**
 * Format session filename (YYYYMMDD-HHMM)
 */
export function formatSessionFilename(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}-${hour}${minute}`;
}

/**
 * Get lowercase day name from date
 */
export function getDayName(date: Date): DayName {
  return DAY_NAMES[date.getDay()];
}

/**
 * Get start of day (midnight) for a date
 */
export function getStartOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get start of today
 */
export function getStartOfToday(): Date {
  return getStartOfDay(new Date());
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/**
 * Get the number of days between two dates
 */
export function daysBetween(date1: Date, date2: Date): number {
  const start = getStartOfDay(date1);
  const end = getStartOfDay(date2);
  const diffMs = Math.abs(end.getTime() - start.getTime());
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Get an array of the last N days (including today)
 */
export function getLastNDays(n: number): Date[] {
  const days: Date[] = [];
  const today = getStartOfToday();
  for (let i = n - 1; i >= 0; i--) {
    days.push(addDays(today, -i));
  }
  return days;
}
