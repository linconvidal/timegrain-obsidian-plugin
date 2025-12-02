import { useState, useEffect, useCallback } from 'react';
import type { TimerStatus, TimerState } from '../types';
import { usePlugin } from '../context/PluginContext';

/**
 * Hook for accessing and controlling the timer
 */
export function useTimer() {
  const { plugin } = usePlugin();
  const timerService = plugin.timerService;

  const [status, setStatus] = useState<TimerStatus>(timerService.getStatus());

  useEffect(() => {
    // Update status on timer events
    const updateStatus = () => {
      setStatus(timerService.getStatus());
    };

    timerService.on('timer-tick', updateStatus);
    timerService.on('timer-start', updateStatus);
    timerService.on('timer-pause', updateStatus);
    timerService.on('timer-resume', updateStatus);
    timerService.on('timer-complete', updateStatus);
    timerService.on('timer-cancel', updateStatus);

    return () => {
      timerService.off('timer-tick', updateStatus);
      timerService.off('timer-start', updateStatus);
      timerService.off('timer-pause', updateStatus);
      timerService.off('timer-resume', updateStatus);
      timerService.off('timer-complete', updateStatus);
      timerService.off('timer-cancel', updateStatus);
    };
  }, [timerService]);

  const start = useCallback(
    async (taskName: string, taskPath: string | null = null) => {
      await timerService.start(taskName, taskPath);
    },
    [timerService]
  );

  const pause = useCallback(async () => {
    return await timerService.pause();
  }, [timerService]);

  const resume = useCallback(async () => {
    await timerService.resume();
  }, [timerService]);

  const togglePause = useCallback(async () => {
    await timerService.togglePause();
  }, [timerService]);

  const complete = useCallback(async () => {
    return await timerService.complete();
  }, [timerService]);

  const cancel = useCallback(async () => {
    await timerService.cancel();
  }, [timerService]);

  return {
    status,
    state: status.state,
    isRunning: status.state === 'running',
    isPaused: status.state === 'paused',
    isIdle: status.state === 'idle',
    taskName: status.taskName,
    taskPath: status.taskPath,
    elapsedSeconds: status.elapsedSeconds,
    currentPomodoro: status.currentPomodoro,
    start,
    pause,
    resume,
    togglePause,
    complete,
    cancel,
  };
}
