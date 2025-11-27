import { describe, it, expect } from 'vitest';
import type { Task, TaskStatus } from '../src/types';

/** Filter state matching the modal's FilterState interface */
interface FilterState {
  showAll: boolean;
  statuses: Set<TaskStatus>;
  areas: Set<string>;
  categories: Set<string>;
  sizeFilter: 'all' | 'quick' | 'deep';
  needsAttention: boolean;
  freshOnly: boolean;
}

const QUICK_TASK_THRESHOLD = 2;
const FRESH_DAYS = 7;

/**
 * Filter logic extracted from TaskSuggestModal for testability
 */
function filterTasks(
  allTasks: Task[],
  completedStatuses: TaskStatus[],
  filters: FilterState
): Task[] {
  const weekAgo = Date.now() - FRESH_DAYS * 24 * 60 * 60 * 1000;

  return allTasks.filter((task) => {
    // Exclude completed (unless showAll)
    if (!filters.showAll && completedStatuses.includes(task.status)) {
      return false;
    }

    // Status filter (if any selected)
    if (filters.statuses.size > 0 && !filters.statuses.has(task.status)) {
      return false;
    }

    // Area filter
    if (filters.areas.size > 0 && !filters.areas.has(task.area)) {
      return false;
    }

    // Category filter
    if (filters.categories.size > 0 && !filters.categories.has(task.category)) {
      return false;
    }

    // Size filter
    if (filters.sizeFilter === 'quick' && task.estimation > QUICK_TASK_THRESHOLD) {
      return false;
    }
    if (filters.sizeFilter === 'deep' && task.estimation <= QUICK_TASK_THRESHOLD) {
      return false;
    }

    // Needs attention (over budget)
    if (filters.needsAttention && task.actualPoms < task.estimation) {
      return false;
    }

    // Fresh (modified recently)
    if (filters.freshOnly && task.modificationDate < weekAgo) {
      return false;
    }

    return true;
  });
}

// Helper to create mock tasks
function createTask(
  name: string,
  status: TaskStatus,
  opts: Partial<{
    estimation: number;
    actualPoms: number;
    area: string;
    category: string;
    modificationDate: number;
  }> = {}
): Task {
  return {
    path: `tasks/${name}.md`,
    name,
    title: name,
    status,
    estimation: opts.estimation ?? 1,
    actualPoms: opts.actualPoms ?? 0,
    expectedEnergy: 3,
    area: opts.area ?? 'test',
    category: opts.category ?? '',
    modificationDate: opts.modificationDate ?? Date.now(),
    file: {} as Task['file'],
  };
}

function defaultFilters(): FilterState {
  return {
    showAll: false,
    statuses: new Set(),
    areas: new Set(),
    categories: new Set(),
    sizeFilter: 'all',
    needsAttention: false,
    freshOnly: false,
  };
}

describe('TaskSuggestModal filtering', () => {
  const completedStatuses: TaskStatus[] = ['done', 'archived'];

  describe('completed status filtering', () => {
    const tasks: Task[] = [
      createTask('Active Task', 'today'),
      createTask('Done Task', 'done'),
      createTask('Archived Task', 'archived'),
    ];

    it('should filter out done and archived tasks by default', () => {
      const result = filterTasks(tasks, completedStatuses, defaultFilters());
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Active Task');
    });

    it('should show all tasks when showAll is true', () => {
      const filters = { ...defaultFilters(), showAll: true };
      const result = filterTasks(tasks, completedStatuses, filters);
      expect(result).toHaveLength(3);
    });
  });

  describe('status chip filtering', () => {
    const tasks: Task[] = [
      createTask('Today Task', 'today'),
      createTask('In Progress Task', 'in progress'),
      createTask('This Week Task', 'this week'),
      createTask('Backlog Task', 'backlog'),
    ];

    it('should filter by single status', () => {
      const filters = { ...defaultFilters(), statuses: new Set<TaskStatus>(['today']) };
      const result = filterTasks(tasks, completedStatuses, filters);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Today Task');
    });

    it('should filter by multiple statuses', () => {
      const filters = {
        ...defaultFilters(),
        statuses: new Set<TaskStatus>(['today', 'in progress']),
      };
      const result = filterTasks(tasks, completedStatuses, filters);
      expect(result).toHaveLength(2);
      expect(result.map((t) => t.name)).toContain('Today Task');
      expect(result.map((t) => t.name)).toContain('In Progress Task');
    });

    it('should show all statuses when none selected', () => {
      const result = filterTasks(tasks, completedStatuses, defaultFilters());
      expect(result).toHaveLength(4);
    });
  });

  describe('area filtering', () => {
    const tasks: Task[] = [
      createTask('Work Task', 'today', { area: 'work' }),
      createTask('Personal Task', 'today', { area: 'personal' }),
      createTask('Side Project', 'today', { area: 'side-projects' }),
    ];

    it('should filter by area', () => {
      const filters = { ...defaultFilters(), areas: new Set(['work']) };
      const result = filterTasks(tasks, completedStatuses, filters);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Work Task');
    });
  });

  describe('category filtering', () => {
    const tasks: Task[] = [
      createTask('Coding Task', 'today', { category: 'coding' }),
      createTask('Writing Task', 'today', { category: 'writing' }),
      createTask('No Category', 'today', { category: '' }),
    ];

    it('should filter by category', () => {
      const filters = { ...defaultFilters(), categories: new Set(['coding']) };
      const result = filterTasks(tasks, completedStatuses, filters);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Coding Task');
    });
  });

  describe('size filtering', () => {
    const tasks: Task[] = [
      createTask('Quick Task 1', 'today', { estimation: 1 }),
      createTask('Quick Task 2', 'today', { estimation: 2 }),
      createTask('Deep Task 1', 'today', { estimation: 3 }),
      createTask('Deep Task 2', 'today', { estimation: 5 }),
    ];

    it('should filter quick tasks (≤2 poms)', () => {
      const filters = { ...defaultFilters(), sizeFilter: 'quick' as const };
      const result = filterTasks(tasks, completedStatuses, filters);
      expect(result).toHaveLength(2);
      expect(result.map((t) => t.name)).toEqual(['Quick Task 1', 'Quick Task 2']);
    });

    it('should filter deep tasks (>2 poms)', () => {
      const filters = { ...defaultFilters(), sizeFilter: 'deep' as const };
      const result = filterTasks(tasks, completedStatuses, filters);
      expect(result).toHaveLength(2);
      expect(result.map((t) => t.name)).toEqual(['Deep Task 1', 'Deep Task 2']);
    });
  });

  describe('needs attention (over budget) filtering', () => {
    const tasks: Task[] = [
      createTask('On Track', 'today', { estimation: 3, actualPoms: 1 }),
      createTask('Over Budget', 'today', { estimation: 2, actualPoms: 3 }),
      createTask('Way Over', 'today', { estimation: 1, actualPoms: 5 }),
    ];

    it('should filter tasks over budget', () => {
      const filters = { ...defaultFilters(), needsAttention: true };
      const result = filterTasks(tasks, completedStatuses, filters);
      expect(result).toHaveLength(2);
      expect(result.map((t) => t.name)).toEqual(['Over Budget', 'Way Over']);
    });
  });

  describe('fresh tasks filtering', () => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;

    const tasks: Task[] = [
      createTask('Fresh Task', 'today', { modificationDate: now - 1000 }),
      createTask('Week Old', 'today', { modificationDate: weekAgo + 1000 }),
      createTask('Old Task', 'today', { modificationDate: twoWeeksAgo }),
    ];

    it('should filter to recently modified tasks', () => {
      const filters = { ...defaultFilters(), freshOnly: true };
      const result = filterTasks(tasks, completedStatuses, filters);
      expect(result).toHaveLength(2);
      expect(result.map((t) => t.name)).toContain('Fresh Task');
      expect(result.map((t) => t.name)).toContain('Week Old');
    });
  });

  describe('combined filters', () => {
    const tasks: Task[] = [
      createTask('Match All', 'today', { area: 'work', category: 'coding', estimation: 1 }),
      createTask('Wrong Status', 'backlog', { area: 'work', category: 'coding', estimation: 1 }),
      createTask('Wrong Area', 'today', { area: 'personal', category: 'coding', estimation: 1 }),
      createTask('Wrong Size', 'today', { area: 'work', category: 'coding', estimation: 5 }),
    ];

    it('should apply multiple filters together', () => {
      const filters: FilterState = {
        showAll: false,
        statuses: new Set<TaskStatus>(['today']),
        areas: new Set(['work']),
        categories: new Set(['coding']),
        sizeFilter: 'quick',
        needsAttention: false,
        freshOnly: false,
      };
      const result = filterTasks(tasks, completedStatuses, filters);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Match All');
    });
  });

  describe('edge cases', () => {
    it('should handle empty task list', () => {
      const result = filterTasks([], completedStatuses, defaultFilters());
      expect(result).toHaveLength(0);
    });

    it('should handle all tasks being filtered out', () => {
      const tasks = [createTask('Done', 'done')];
      const result = filterTasks(tasks, completedStatuses, defaultFilters());
      expect(result).toHaveLength(0);
    });
  });
});
