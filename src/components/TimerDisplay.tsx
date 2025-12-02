import * as React from 'react';
const { useState } = React;
import { TFile } from 'obsidian';
import { useTimer } from '../hooks/useTimer';
import { useSessions } from '../hooks/useSessions';
import { useSettings } from '../hooks/useSettings';
import { usePlugin } from '../context/PluginContext';
import { formatTimeOfDay, formatDurationHuman } from '../utils/formatters';
import { GrainStack } from './GrainStack';
import { ControlButtons } from './ControlButtons';
import { TaskSelector } from './TaskSelector';
import { ActionBar } from './ActionBar';
import { HourglassIcon } from './icons/GrainIcon';
import type { Feeling } from '../types';

const FEELING_EMOJIS: Record<Feeling, string> = {
  very_weak: '😞',
  weak: '😟',
  normal: '😐',
  strong: '😊',
  very_strong: '😄',
};

/**
 * Main timer display component for the sidebar view
 */
export function TimerDisplay() {
  const { isRunning, isPaused, isIdle, taskName, taskPath, elapsedSeconds, currentPomodoro } = useTimer();
  const { todaySessions, todayPomodoros } = useSessions();
  const { settings } = useSettings();
  const { plugin, app } = usePlugin();

  const handleTaskClick = () => {
    if (taskPath) {
      const file = app.vault.getAbstractFileByPath(taskPath);
      if (file instanceof TFile) {
        app.workspace.getLeaf().openFile(file);
      }
    }
  };

  return (
    <div className="timegrain-timer">
      {/* Header */}
      <div className="timegrain-timer-header">
        <div className="timegrain-brand">
          <HourglassIcon size={20} className="timegrain-brand-icon" />
          <h4>Timegrain</h4>
        </div>
        <div className="timegrain-progress-dots">
          {Array.from({ length: Math.max(settings.dailyGoalPoms, todayPomodoros) }, (_, i) => (
            <span
              key={i}
              className={`timegrain-progress-dot ${i < todayPomodoros ? 'completed' : ''} ${i >= settings.dailyGoalPoms ? 'bonus' : ''}`}
            />
          ))}
        </div>
      </div>

      {/* Grain visualization */}
      <GrainStack
        completedGrains={todayPomodoros}
        goalGrains={settings.dailyGoalPoms}
        currentProgress={isRunning || isPaused ? (elapsedSeconds % (settings.cycleSeconds)) / settings.cycleSeconds : 0}
        isActive={isRunning}
      />

      {/* Timer display - hero element */}
      <div className={`timegrain-time-display ${isRunning ? 'timegrain-running' : ''} ${isPaused ? 'timegrain-paused' : ''}`}>
        <TimerDigits seconds={elapsedSeconds} isRunning={isRunning} isPaused={isPaused} />
        {(isRunning || isPaused) && (
          <span className="timegrain-pomodoro-count">
            Grain {currentPomodoro}
          </span>
        )}
      </div>

      {/* Control buttons */}
      <ControlButtons />

      {/* Current task or task selector */}
      {isIdle ? (
        <TaskSelector />
      ) : (
        <div className="timegrain-current-task">
          <span
            className="timegrain-task-name-display"
            onClick={handleTaskClick}
            title="Open task"
          >
            {taskName || 'Unknown task'}
          </span>
        </div>
      )}

      {/* Action bar - only when idle */}
      {isIdle && <ActionBar />}

      {/* Recent sessions */}
      <RecentSessions
        sessions={todaySessions}
        app={app}
        plugin={plugin}
      />
    </div>
  );
}

/**
 * Timer digits with animated colons and hierarchy
 */
function TimerDigits({ seconds, isRunning, isPaused }: { seconds: number; isRunning: boolean; isPaused: boolean }) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');

  return (
    <div className="timegrain-digits">
      <span className="timegrain-digit-group timegrain-hours">{hh}</span>
      <span className={`timegrain-colon ${isRunning ? 'timegrain-colon-pulse' : ''}`}>:</span>
      <span className="timegrain-digit-group timegrain-minutes">{mm}</span>
      <span className={`timegrain-colon ${isRunning ? 'timegrain-colon-pulse' : ''}`}>:</span>
      <span className="timegrain-digit-group timegrain-seconds">{ss}</span>
    </div>
  );
}

/**
 * Recent sessions list with expandable view
 */
function RecentSessions({
  sessions,
  app,
  plugin,
}: {
  sessions: import('../types').Session[];
  app: import('obsidian').App;
  plugin: import('../main').default;
}) {
  const [showAll, setShowAll] = useState(false);
  const INITIAL_COUNT = 5;

  const displayedSessions = showAll ? sessions : sessions.slice(0, INITIAL_COUNT);
  const hasMore = sessions.length > INITIAL_COUNT;

  const handleSessionTaskClick = (taskLink: string) => {
    // Extract path from wikilink format [[Task Name]] or [[path/to/task|Task Name]]
    const match = taskLink.match(/\[\[([^\]|]+)/);
    if (!match) return;

    const linkText = match[1];
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
  };

/**
   * Effort ring - circular progress from 0-10 with color gradient
   */
  function EffortRing({ effort }: { effort: number }) {
    const size = 16;
    const strokeWidth = 2.5;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = effort / 10;
    const strokeDashoffset = circumference * (1 - progress);

    // Color based on effort level: green (low) -> yellow -> red (high)
    const getColor = (e: number) => {
      if (e <= 3) return '#4ade80'; // green
      if (e <= 5) return '#facc15'; // yellow
      if (e <= 7) return '#fb923c'; // orange
      return '#ef4444'; // red
    };

    return (
      <span className="timegrain-effort-ring" title={`Effort: ${effort}/10`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--background-modifier-border)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor(effort)}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        {/* Center text */}
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="7"
          fill="var(--text-muted)"
        >
          {effort}
        </text>
      </svg>
      </span>
    );
  }

  return (
    <div className="timegrain-recent-sessions">
      <h5>Recent Sessions</h5>
      {sessions.length === 0 ? (
        <p className="timegrain-empty-state">No sessions yet today</p>
      ) : (
        <>
          <ul className="timegrain-session-list">
            {displayedSessions.map((session) => (
              <li key={session.filePath} className="timegrain-session-item">
                <span
                  className="timegrain-session-time"
                  onClick={() => app.workspace.getLeaf().openFile(session.file)}
                  title="Open session file"
                >
                  {formatTimeOfDay(session.started)}
                  {session.ended && ` → ${formatTimeOfDay(session.ended)}`}
                </span>
                <span
                  className="timegrain-session-task"
                  onClick={() => handleSessionTaskClick(session.taskLink)}
                  title={`Open ${session.taskName}`}
                >
                  {session.taskName}
                </span>
                {session.perceivedEffort !== undefined && (
                  <EffortRing effort={session.perceivedEffort} />
                )}
                {session.feeling && (
                  <span className="timegrain-session-feeling" title={session.feeling.replace('_', ' ')}>
                    {FEELING_EMOJIS[session.feeling]}
                  </span>
                )}
                {session.durationMs && (
                  <span className="timegrain-session-duration">
                    {formatDurationHuman(session.durationMs)}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {hasMore && (
            <span
              className="timegrain-show-more"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? '↑ Show less' : `↓ Show ${sessions.length - INITIAL_COUNT} more`}
            </span>
          )}
        </>
      )}
    </div>
  );
}
