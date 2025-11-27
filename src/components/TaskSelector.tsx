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
          <div className="timegrain-start-info">
            <span className="timegrain-start-label">Start focus</span>
            <span className="timegrain-start-task">{activeFile?.basename || 'No note selected'}</span>
          </div>
        </button>

        <button
          className="timegrain-search-btn"
          onClick={handleOpenTaskSuggester}
          title="Search all tasks"
        >
          <SearchIcon />
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
            {filteredTasks.slice(0, 10).map((task) => (
              <li key={task.path} className="timegrain-task-item">
                <button
                  className="timegrain-task-button"
                  onClick={() => handleStartWithTask(task)}
                >
                  <span className="timegrain-task-name">{task.title || task.name}</span>
                  <span className="timegrain-task-meta">
                    <span className="timegrain-task-status">{task.status}</span>
                    {task.estimation > 0 && (
                      <span className="timegrain-task-estimation">
                        {task.actualPoms}/{task.estimation}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
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
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <line x1="16" y1="16" x2="20" y2="20" />
    </svg>
  );
}
