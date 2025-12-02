import { useState, useEffect } from 'react';
import { useTimer } from '../hooks/useTimer';
import { useTasks } from '../hooks/useTasks';
import { usePlugin } from '../context/PluginContext';
import { useSettings } from '../hooks/useSettings';
import type { Task } from '../types';
import type { TFile } from 'obsidian';

/**
 * Task selector component for starting a timer
 * Shows tasks filtered by status with search
 */
export function TaskSelector() {
  const { start } = useTimer();
  const { settings } = useSettings();
  const { tasks, loading } = useTasks(settings.taskStatuses);
  const { plugin, app } = usePlugin();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFile, setActiveFile] = useState<TFile | null>(app.workspace.getActiveFile());

  // Track active file changes so the button updates reactively
  useEffect(() => {
    const updateActiveFile = () => {
      setActiveFile(app.workspace.getActiveFile());
    };

    // Listen for active leaf changes
    const eventRef = app.workspace.on('active-leaf-change', updateActiveFile);

    return () => {
      app.workspace.offref(eventRef);
    };
  }, [app.workspace]);

  const filteredTasks = searchQuery
    ? tasks.filter(
        (t) =>
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tasks;

  const handleStartWithTask = async (task: Task) => {
    await start(task.name, task.path);
  };

  const handleStartWithCurrentNote = async () => {
    if (activeFile) {
      await start(activeFile.basename, activeFile.path);
    }
  };

  const handleOpenTaskSuggester = () => {
    plugin.openTaskSuggester();
  };

  const handleOpenNewTask = () => {
    plugin.openNewTaskModal();
  };

  const handleOpenPlanDay = () => {
    plugin.openPlanDayModal();
  };

  const handleOpenDailyLog = () => {
    plugin.activateDashboardView();
  };

  return (
    <div className="timegrain-task-selector">
      {/* Quick start */}
      <div className="timegrain-quick-start">
        <button
          className="timegrain-start-btn"
          onClick={handleStartWithCurrentNote}
          disabled={!activeFile}
        >
          <div className="timegrain-start-icon">
            <PlayIcon />
          </div>
          <span className="timegrain-start-task">{activeFile?.basename || 'No note selected'}</span>
        </button>
      </div>

      {/* Action buttons */}
      <div className="timegrain-action-bar">
        <button
          className="timegrain-action-btn"
          onClick={handleOpenTaskSuggester}
          title="Search all tasks"
        >
          <SearchIcon />
          <span className="timegrain-action-label">Search</span>
        </button>
        <button
          className="timegrain-action-btn"
          onClick={handleOpenNewTask}
          title="Create new task"
        >
          <PlusIcon />
          <span className="timegrain-action-label">New</span>
        </button>
        <button
          className="timegrain-action-btn"
          onClick={handleOpenPlanDay}
          title="Plan your day"
        >
          <CalendarCheckIcon />
          <span className="timegrain-action-label">Plan</span>
        </button>
        <button
          className="timegrain-action-btn"
          onClick={handleOpenDailyLog}
          title="Open daily log"
        >
          <ChartIcon />
          <span className="timegrain-action-label">Log</span>
        </button>
      </div>

      {/* Task list */}
      <div className="timegrain-task-list">
        <h5>
          Tasks ({settings.taskStatuses.join(', ')})
        </h5>

        {/* Search input */}
        <input
          type="text"
          className="timegrain-search-input"
          placeholder="Filter tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {loading ? (
          <p className="timegrain-loading">Loading tasks...</p>
        ) : filteredTasks.length === 0 ? (
          <p className="timegrain-empty-state">
            {searchQuery ? 'No matching tasks' : 'No tasks found'}
          </p>
        ) : (
          <ul className="timegrain-task-items">
            {filteredTasks.slice(0, 10).map((task) => {
              const progressPercent = task.estimation > 0
                ? Math.min(100, Math.round((task.actualPoms / task.estimation) * 100))
                : 0;

              return (
                <li key={task.path} className="timegrain-task-item">
                  <button
                    className="timegrain-task-button"
                    data-status={task.status?.toLowerCase()}
                    onClick={() => handleStartWithTask(task)}
                  >
                    <div className="timegrain-task-header">
                      <div className="timegrain-task-name">{task.title || task.name}</div>
                      {task.estimation > 0 && (
                        <div className="timegrain-task-progress">
                          <div className="timegrain-progress-bar">
                            <div
                              className="timegrain-progress-fill"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <span className="timegrain-task-estimation">
                            {task.actualPoms}/{task.estimation}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="timegrain-task-meta">
                      <span className="timegrain-task-status">{task.status}</span>
                      {task.scope && (
                        <span className="timegrain-task-scope">{task.scope}</span>
                      )}
                      {task.category && (
                        <span className="timegrain-task-category-tag">{task.category}</span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
            {filteredTasks.length > 10 && (
              <li className="timegrain-task-more">
                +{filteredTasks.length - 10} more tasks
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

// Simple SVG icons
function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
      <polygon points="6,4 20,12 6,20" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <line x1="16" y1="16" x2="20" y2="20" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function CalendarCheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <polyline points="9 16 11 18 15 14" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}
