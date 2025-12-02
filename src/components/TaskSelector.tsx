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
              // Calculate progress ratio for color gradient
              const ratio = task.estimation > 0 ? task.actualPoms / task.estimation : 0;
              const progressPercent = Math.min(100, Math.round(ratio * 100));

              // Color gradient: green (0-100%) → yellow (100-150%) → orange (150-200%) → red (200%+)
              const getProgressColor = (r: number): string => {
                if (r <= 1) {
                  // Green - on track or under
                  return 'rgb(74, 222, 128)';
                } else if (r <= 1.5) {
                  // Green to yellow (100% to 150%)
                  const t = (r - 1) / 0.5;
                  return `rgb(${Math.round(74 + (250 - 74) * t)}, ${Math.round(222 - (222 - 204) * t)}, ${Math.round(128 - (128 - 21) * t)})`;
                } else if (r <= 2) {
                  // Yellow to orange (150% to 200%)
                  const t = (r - 1.5) / 0.5;
                  return `rgb(${Math.round(250 + (251 - 250) * t)}, ${Math.round(204 - (204 - 146) * t)}, ${Math.round(21 + (60 - 21) * t)})`;
                } else {
                  // Red (200%+)
                  return 'rgb(239, 68, 68)';
                }
              };

              const progressColor = getProgressColor(ratio);

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
                              style={{
                                width: `${progressPercent}%`,
                                background: progressColor,
                              }}
                            />
                          </div>
                          <span
                            className="timegrain-task-estimation"
                            style={{ color: ratio > 1 ? progressColor : undefined }}
                          >
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

// Simple SVG icon
function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
      <polygon points="6,4 20,12 6,20" />
    </svg>
  );
}
