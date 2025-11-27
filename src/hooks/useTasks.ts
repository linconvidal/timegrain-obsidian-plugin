import { useState, useEffect, useCallback, useRef } from 'react';
import type { Task, TaskStatus } from '../types';
import { usePlugin } from '../context/PluginContext';

/**
 * Hook for accessing task data
 */
export function useTasks(statuses?: TaskStatus[]) {
  const { plugin } = usePlugin();
  const taskRepository = plugin.taskRepository;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Store statuses in a ref to avoid dependency issues with arrays
  // Use a stable string key for comparison
  const statusKey = statuses ? [...statuses].sort().join(',') : '';
  const statusesRef = useRef(statuses);
  statusesRef.current = statuses;

  const refresh = useCallback(() => {
    setLoading(true);
    try {
      const currentStatuses = statusesRef.current;
      const allTasks = currentStatuses
        ? taskRepository.getTasksByStatuses(currentStatuses)
        : taskRepository.getAllTasks();
      setTasks(allTasks);
    } finally {
      setLoading(false);
    }
  }, [taskRepository, statusKey]);

  useEffect(() => {
    refresh();

    // Listen for task updates
    taskRepository.on('tasks-updated', refresh);

    return () => {
      taskRepository.off('tasks-updated', refresh);
    };
  }, [taskRepository, refresh]);

  return {
    tasks,
    loading,
    refresh,
  };
}

/**
 * Hook for getting tasks grouped by status
 */
export function useTasksByStatus() {
  const { plugin } = usePlugin();
  const taskRepository = plugin.taskRepository;

  const [tasksByStatus, setTasksByStatus] = useState<Record<TaskStatus, Task[]>>(
    {} as Record<TaskStatus, Task[]>
  );
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    try {
      const grouped = taskRepository.getTasksGroupedByStatus();
      setTasksByStatus(grouped);
    } finally {
      setLoading(false);
    }
  }, [taskRepository]);

  useEffect(() => {
    refresh();

    taskRepository.on('tasks-updated', refresh);

    return () => {
      taskRepository.off('tasks-updated', refresh);
    };
  }, [taskRepository, refresh]);

  return {
    tasksByStatus,
    loading,
    refresh,
  };
}

/**
 * Hook for searching tasks
 */
export function useTaskSearch(query: string) {
  const { tasks } = useTasks();

  const filteredTasks = tasks.filter((task) => {
    const searchLower = query.toLowerCase();
    return (
      task.name.toLowerCase().includes(searchLower) ||
      task.title.toLowerCase().includes(searchLower) ||
      task.area.toLowerCase().includes(searchLower) ||
      task.category.toLowerCase().includes(searchLower)
    );
  });

  return filteredTasks;
}
