import { usePlugin } from '../context/PluginContext';

/**
 * Action bar with quick access buttons
 * Always visible at the top
 */
export function ActionBar() {
  const { plugin } = usePlugin();

  return (
    <div className="timegrain-action-bar">
      <button
        className="timegrain-action-btn"
        onClick={() => plugin.openTaskSuggester()}
        title="Search all tasks"
      >
        <SearchIcon />
        <span className="timegrain-action-label">Search</span>
      </button>
      <button
        className="timegrain-action-btn"
        onClick={() => plugin.openNewTaskModal()}
        title="Create new task"
      >
        <PlusIcon />
        <span className="timegrain-action-label">New</span>
      </button>
      <button
        className="timegrain-action-btn"
        onClick={() => plugin.openPlanDayModal()}
        title="Plan your day"
      >
        <CalendarCheckIcon />
        <span className="timegrain-action-label">Plan</span>
      </button>
      <button
        className="timegrain-action-btn"
        onClick={() => plugin.activateDashboardView()}
        title="Open daily log"
      >
        <ChartIcon />
        <span className="timegrain-action-label">Log</span>
      </button>
    </div>
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
