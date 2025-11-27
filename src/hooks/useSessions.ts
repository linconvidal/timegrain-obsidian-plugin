import { useState, useEffect, useCallback, useRef } from 'react';
import type { Session, ActiveSession } from '../types';
import { usePlugin } from '../context/PluginContext';

/**
 * Hook for accessing session data
 */
export function useSessions() {
  const { plugin } = usePlugin();
  const sessionRepository = plugin.sessionRepository;

  const [sessions, setSessions] = useState<Session[]>([]);
  const [todaySessions, setTodaySessions] = useState<Session[]>([]);
  const [todayPomodoros, setTodayPomodoros] = useState(0);
  const [loading, setLoading] = useState(true);

  // Track mounted state to prevent state updates after unmount
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [allSessions, todaySess, todayPoms] = await Promise.all([
        sessionRepository.getAllSessions(),
        sessionRepository.getTodaySessions(),
        sessionRepository.getTodayPomodoros(),
      ]);

      // Only update state if still mounted
      if (mountedRef.current) {
        setSessions(allSessions);
        setTodaySessions(todaySess);
        setTodayPomodoros(todayPoms);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [sessionRepository]);

  useEffect(() => {
    mountedRef.current = true;
    refresh();

    // Refresh when timer completes, stops, or session is updated
    const timerService = plugin.timerService;
    timerService.on('timer-complete', refresh);
    timerService.on('timer-stop', refresh);
    timerService.on('session-updated', refresh);

    return () => {
      mountedRef.current = false;
      timerService.off('timer-complete', refresh);
      timerService.off('timer-stop', refresh);
      timerService.off('session-updated', refresh);
    };
  }, [refresh, plugin.timerService]);

  return {
    sessions,
    todaySessions,
    todayPomodoros,
    loading,
    refresh,
  };
}

/**
 * Hook for accessing sessions for a specific date
 */
export function useSessionsForDate(date: Date) {
  const { plugin } = usePlugin();
  const sessionRepository = plugin.sessionRepository;

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  // Track mounted state to prevent state updates after unmount
  const mountedRef = useRef(true);

  // Use date string as stable key to prevent infinite re-renders
  // (Date objects have new references on each render)
  const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

  // Store date in ref to avoid stale closure with dateKey dependency
  const dateRef = useRef(date);
  dateRef.current = date;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const dateSessions = await sessionRepository.getSessionsForDate(dateRef.current);
      if (mountedRef.current) {
        setSessions(dateSessions);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [sessionRepository, dateKey]);

  useEffect(() => {
    mountedRef.current = true;
    refresh();

    return () => {
      mountedRef.current = false;
    };
  }, [refresh]);

  return {
    sessions,
    loading,
    refresh,
  };
}

/**
 * Hook for checking active/unfinished sessions
 */
export function useActiveSessions() {
  const { plugin } = usePlugin();
  const sessionRepository = plugin.sessionRepository;

  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Track mounted state to prevent state updates after unmount
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const active = await sessionRepository.findActiveSessions();
      if (mountedRef.current) {
        setActiveSessions(active);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [sessionRepository]);

  useEffect(() => {
    mountedRef.current = true;
    refresh();

    return () => {
      mountedRef.current = false;
    };
  }, [refresh]);

  return {
    activeSessions,
    hasUnfinishedSession: activeSessions.length > 0,
    latestUnfinished: activeSessions[0] || null,
    loading,
    refresh,
  };
}
