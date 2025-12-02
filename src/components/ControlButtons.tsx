import { useTimer } from '../hooks/useTimer';
import { usePlugin } from '../context/PluginContext';

/**
 * Timer control buttons: Pause/Resume, Complete, Cancel
 */
export function ControlButtons() {
  const { isRunning, isPaused, isIdle, togglePause, complete, cancel } = useTimer();
  const { plugin } = usePlugin();

  const handleComplete = async () => {
    const sessionFile = await complete();
    if (sessionFile) {
      // Show energy modal
      plugin.showEnergyModal(sessionFile);
    }
  };

  const handleCancel = async () => {
    await cancel();
    // No energy modal - session is discarded
  };

  if (isIdle) {
    return null; // Task selector handles starting
  }

  return (
    <div className="timegrain-controls">
      {/* Pause/Resume button */}
      <button
        className="timegrain-btn timegrain-btn-secondary"
        onClick={togglePause}
        aria-label={isPaused ? 'Resume' : 'Pause'}
      >
        {isPaused ? (
          <>
            <PlayIcon />
            <span>Resume</span>
          </>
        ) : (
          <>
            <PauseIcon />
            <span>Pause</span>
          </>
        )}
      </button>

      {/* Complete button */}
      <button
        className="timegrain-btn timegrain-btn-primary"
        onClick={handleComplete}
        aria-label="Complete session"
      >
        <CheckIcon />
        <span>Complete</span>
      </button>

      {/* Cancel button */}
      <button
        className="timegrain-btn timegrain-btn-danger"
        onClick={handleCancel}
        aria-label="Cancel session"
      >
        <CancelIcon />
        <span>Cancel</span>
      </button>
    </div>
  );
}

// Simple SVG icons
function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20,6 9,17 4,12" />
    </svg>
  );
}

function CancelIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
