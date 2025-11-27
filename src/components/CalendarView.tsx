import * as React from 'react';
const { useState, useMemo, useCallback } = React;
import { TFile } from 'obsidian';
import { useSessions, useSessionsForDate } from '../hooks/useSessions';
import { usePlugin } from '../context/PluginContext';
import { formatDateOnly, isSameDay, addDays } from '../utils/datetime';
import { extractTaskName, formatDurationHuman } from '../utils/formatters';

interface CalendarViewProps {
  onClose?: () => void;
}

/**
 * Calendar view with mini calendar and daily timeline
 */
export function CalendarView({ onClose }: CalendarViewProps): JSX.Element {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMonth, setViewMonth] = useState(new Date());

  return (
    <div className="timegrain-calendar-view">
      <div className="timegrain-calendar-header">
        <h4>Daily Log</h4>
        {onClose && (
          <button className="timegrain-close-btn" onClick={onClose}>
            ×
          </button>
        )}
      </div>
      <div className="timegrain-calendar-content">
        <MiniCalendar
          selectedDate={selectedDate}
          viewMonth={viewMonth}
          onSelectDate={setSelectedDate}
          onChangeMonth={setViewMonth}
        />
        <DayTimeline date={selectedDate} />
      </div>
    </div>
  );
}

interface MiniCalendarProps {
  selectedDate: Date;
  viewMonth: Date;
  onSelectDate: (date: Date) => void;
  onChangeMonth: (date: Date) => void;
}

function MiniCalendar({
  selectedDate,
  viewMonth,
  onSelectDate,
  onChangeMonth,
}: MiniCalendarProps): JSX.Element {
  const { sessions } = useSessions();
  // Get today's date - will update when component re-renders
  const today = new Date();

  // Get session counts by date for the month
  const sessionCountsByDate = useMemo(() => {
    const counts = new Map<string, number>();
    sessions.forEach((session) => {
      const dateStr = formatDateOnly(session.started);
      counts.set(dateStr, (counts.get(dateStr) || 0) + 1);
    });
    return counts;
  }, [sessions]);

  // Get max sessions in month for heat map intensity
  const maxSessions = useMemo(() => {
    let max = 0;
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();

    sessionCountsByDate.forEach((count, dateStr) => {
      const [y, m] = dateStr.split('-').map(Number);
      if (y === year && m - 1 === month) {
        max = Math.max(max, count);
      }
    });
    return max;
  }, [sessionCountsByDate, viewMonth]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay(); // 0 = Sunday

    const days: (Date | null)[] = [];

    // Padding for days before the 1st
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }

    // Days of the month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }

    return days;
  }, [viewMonth]);

  const prevMonth = useCallback(() => {
    const newDate = new Date(viewMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    onChangeMonth(newDate);
  }, [viewMonth, onChangeMonth]);

  const nextMonth = useCallback(() => {
    const newDate = new Date(viewMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    onChangeMonth(newDate);
  }, [viewMonth, onChangeMonth]);

  const goToToday = useCallback(() => {
    onChangeMonth(new Date());
    onSelectDate(new Date());
  }, [onChangeMonth, onSelectDate]);

  const monthName = viewMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="timegrain-mini-calendar">
      <div className="timegrain-calendar-nav">
        <button onClick={prevMonth} className="timegrain-nav-btn">
          ←
        </button>
        <button onClick={goToToday} className="timegrain-month-label">
          {monthName}
        </button>
        <button onClick={nextMonth} className="timegrain-nav-btn">
          →
        </button>
      </div>
      <div className="timegrain-calendar-weekdays">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
          <span key={day} className="timegrain-weekday">
            {day}
          </span>
        ))}
      </div>
      <div className="timegrain-calendar-grid">
        {calendarDays.map((date, i) => {
          if (!date) {
            return <span key={`empty-${i}`} className="timegrain-day-empty" />;
          }

          const dateStr = formatDateOnly(date);
          const sessionCount = sessionCountsByDate.get(dateStr) || 0;
          const intensity = maxSessions > 0 ? Math.ceil((sessionCount / maxSessions) * 5) : 0;
          const isToday = isSameDay(date, today);
          const isSelected = isSameDay(date, selectedDate);
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;

          return (
            <button
              key={dateStr}
              className={`timegrain-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${isWeekend ? 'weekend' : ''} intensity-${intensity}`}
              onClick={() => onSelectDate(date)}
              title={sessionCount > 0 ? `${sessionCount} session(s)` : undefined}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface DayTimelineProps {
  date: Date;
}

function DayTimeline({ date }: DayTimelineProps): JSX.Element {
  const { sessions, loading } = useSessionsForDate(date);
  const { app, plugin } = usePlugin();
  const [hoveredSessionId, setHoveredSessionId] = useState<string | null>(null);
  // Get today's date - will update when component re-renders
  const today = new Date();

  // Generate deterministic color from task name
  const getTaskColor = useCallback((taskName: string): string => {
    let hash = 0;
    for (let i = 0; i < taskName.length; i++) {
      hash = taskName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 50%)`;
  }, []);

  // Calculate hour range (7am to 10pm, or expand based on sessions)
  const { startHour, endHour } = useMemo(() => {
    let minHour = 7;
    let maxHour = 22;

    sessions.forEach((session) => {
      const startH = session.started.getHours();
      const endDate = session.ended || new Date();

      // For midnight-spanning sessions, extend to 24
      if (!isSameDay(session.started, endDate)) {
        maxHour = 24;
      } else {
        maxHour = Math.max(maxHour, endDate.getHours() + 1);
      }
      minHour = Math.min(minHour, startH);
    });

    return { startHour: minHour, endHour: Math.min(maxHour, 24) };
  }, [sessions]);

  // Group sessions by task for legend (with path for navigation)
  const taskInfo = useMemo(() => {
    const info = new Map<string, { color: string; taskLink: string }>();
    sessions.forEach((session) => {
      const name = extractTaskName(session.taskLink);
      if (!info.has(name)) {
        info.set(name, {
          color: getTaskColor(name),
          taskLink: session.taskLink,
        });
      }
    });
    return info;
  }, [sessions, getTaskColor]);

  // Navigate to task file
  const handleTaskClick = useCallback((taskLink: string) => {
    // Extract path from wikilink format [[Task Name]] or [[path/to/task|Task Name]]
    const match = taskLink.match(/\[\[([^\]|]+)/);
    if (!match) return;

    const linkText = match[1];
    // Try to find the file - could be a path or just a name
    const file = app.metadataCache.getFirstLinkpathDest(linkText, '');
    if (file instanceof TFile) {
      app.workspace.getLeaf().openFile(file);
    } else {
      // Try finding by task name in repository
      const task = plugin.taskRepository.findTaskByName(linkText);
      if (task?.file) {
        app.workspace.getLeaf().openFile(task.file);
      }
    }
  }, [app, plugin]);

  // Calculate total duration
  const totalDuration = useMemo(() => {
    return sessions.reduce((acc, session) => {
      return acc + (session.durationMs || 0);
    }, 0);
  }, [sessions]);

  // Format date label
  const dateLabel = useMemo(() => {
    if (isSameDay(date, today)) {
      return 'Today';
    }
    const yesterday = addDays(today, -1);
    if (isSameDay(date, yesterday)) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }, [date, today]);

  const hours = useMemo(() => {
    const arr = [];
    for (let h = startHour; h < endHour; h++) {
      arr.push(h);
    }
    return arr;
  }, [startHour, endHour]);

  if (loading) {
    return (
      <div className="timegrain-day-timeline">
        <div className="timegrain-loading">Loading sessions...</div>
      </div>
    );
  }

  return (
    <div className="timegrain-day-timeline">
      <div className="timegrain-timeline-header">
        <span className="timegrain-date-label">{dateLabel}</span>
        <span className="timegrain-duration-label">
          {totalDuration > 0
            ? `Total: ${formatDurationHuman(totalDuration)}`
            : 'No sessions recorded'}
        </span>
      </div>

      {sessions.length > 0 ? (
        <>
          <div className="timegrain-timeline-chart">
            {hours.map((hour) => {
              const hourSessions = sessions.filter((s) => {
                const startH = s.started.getHours();
                const endDate = s.ended || new Date();
                const endH = endDate.getHours();

                // Handle same-day sessions
                if (isSameDay(s.started, endDate)) {
                  return startH <= hour && endH >= hour;
                }

                // Handle midnight-spanning sessions (started on this day, ended next day)
                // Session spans from startH to 23:59 on this day
                return startH <= hour;
              });

              return (
                <div key={hour} className="timegrain-timeline-hour">
                  <span className="timegrain-hour-label">
                    {hour.toString().padStart(2, '0')}:00
                  </span>
                  <div className="timegrain-hour-bar">
                    {hourSessions.length > 0 ? (
                      hourSessions.map((session, i) => {
                        const taskName = extractTaskName(session.taskLink);
                        const color = taskInfo.get(taskName)?.color || '#888';
                        const isActive = !session.ended;

                        // Calculate fill within this hour
                        const startMin = session.started.getHours() === hour
                          ? session.started.getMinutes()
                          : 0;

                        // For midnight-spanning sessions, use 60 for hours before end
                        const endDate = session.ended || new Date();
                        const sessionSpansDays = !isSameDay(session.started, endDate);
                        let endMin: number;
                        if (sessionSpansDays) {
                          // Session spans midnight - fill to end of hour
                          endMin = 60;
                        } else if (endDate.getHours() === hour) {
                          endMin = endDate.getMinutes();
                        } else {
                          endMin = 60;
                        }
                        const width = ((endMin - startMin) / 60) * 100;
                        const left = (startMin / 60) * 100;

                        // Format times as HH:MM
                        const formatTime = (d: Date) =>
                          `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                        const startTimeStr = formatTime(session.started);
                        const endTimeStr = session.ended ? formatTime(session.ended) : 'ongoing';
                        const durationStr = session.durationMs
                          ? `(${formatDurationHuman(session.durationMs)})`
                          : '';

                        const isHovered = hoveredSessionId === session.filePath;

                        return (
                          <div
                            key={`${session.filePath}-${i}`}
                            className={`timegrain-session-block ${isActive ? 'active' : ''} ${isHovered ? 'hovered' : ''}`}
                            style={{
                              backgroundColor: color,
                              left: `${left}%`,
                              width: `${Math.max(width, 5)}%`,
                            }}
                            title={`${taskName}\n${startTimeStr} → ${endTimeStr} ${durationStr}`}
                            onMouseEnter={() => setHoveredSessionId(session.filePath)}
                            onMouseLeave={() => setHoveredSessionId(null)}
                          />
                        );
                      })
                    ) : (
                      <span className="timegrain-hour-empty">·</span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Current time indicator for today */}
            {isSameDay(date, today) && today.getHours() >= startHour && today.getHours() < endHour && (
              <div
                className="timegrain-current-time"
                style={{
                  // Vertical: each row is 24px + 1px gap
                  top: `${(today.getHours() - startHour) * 25}px`,
                  // Horizontal: minutes as percentage within hour bar (after 54px label)
                  '--minute-percent': `${(today.getMinutes() / 60) * 100}%`,
                } as React.CSSProperties}
              >
                <span className="timegrain-time-text">
                  {today.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
          </div>

          {/* Task legend */}
          <div className="timegrain-timeline-legend">
            {Array.from(taskInfo.entries()).map(([name, info]) => {
              const taskSessions = sessions.filter(
                (s) => extractTaskName(s.taskLink) === name
              );
              const hasActive = taskSessions.some((s) => !s.ended);

              return (
                <button
                  key={name}
                  className="timegrain-legend-item"
                  onClick={() => handleTaskClick(info.taskLink)}
                  title={`Open ${name}`}
                >
                  <span
                    className="timegrain-legend-color"
                    style={{ backgroundColor: info.color }}
                  >
                    {hasActive ? '▶' : ''}
                  </span>
                  <span className="timegrain-legend-name">{name}</span>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div className="timegrain-empty-state">
          <p>No sessions recorded for this day</p>
        </div>
      )}
    </div>
  );
}

export default CalendarView;
