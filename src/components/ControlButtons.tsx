import { useTimer } from '../hooks/useTimer';
import { usePlugin } from '../context/PluginContext';

/**
 * Timer control buttons: Start, Pause/Resume, Complete, Stop
 */
export function ControlButtons() {
  const { isRunning, isPaused, isIdle, togglePause, complete, stop } = useTimer();
  const { plugin } = usePlugin();

  const handleComplete = async () => {
    const sessionFile = await complete();
    if (sessionFile) {
      // Show energy modal
      plugin.showEnergyModal(sessionFile);
    }
  };

  const handleStop = async () => {
    const sessionFile = await stop();
    if (sessionFile) {
      // Show energy modal for stop too
      plugin.showEnergyModal(sessionFile);
    }
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

      {/* Stop button */}
      <button
        className="timegrain-btn timegrain-btn-danger"
        onClick={handleStop}
        aria-label="Stop session"
      >
        <StopIcon />
        <span>Stop</span>
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

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  );
}
