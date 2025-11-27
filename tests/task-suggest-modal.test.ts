import { describe, it, expect } from 'vitest';
import type { Task, TaskStatus } from '../src/types';

/**
 * Filter logic extracted from TaskSuggestModal for testability
 */
function filterTasks(
  allTasks: Task[],
  completedStatuses: TaskStatus[],
  showAll: boolean
): Task[] {
  return showAll
    ? allTasks
    : allTasks.filter((t) => !completedStatuses.includes(t.status));
}

// Helper to create mock tasks
function createTask(name: string, status: TaskStatus): Task {
  return {
    path: `tasks/${name}.md`,
    name,
    title: name,
    status,
    estimation: 1,
    actualPoms: 0,
    expectedEnergy: 3,
    area: 'test',
    category: '',
    modificationDate: Date.now(),
    file: {} as Task['file'],
  };
}

describe('TaskSuggestModal filtering', () => {
  const tasks: Task[] = [
    createTask('Active Task 1', 'today'),
    createTask('Active Task 2', 'in progress'),
    createTask('Backlog Task', 'backlog'),
    createTask('Done Task', 'done'),
    createTask('Archived Task', 'archived'),
    createTask('On Hold Task', 'on hold'),
  ];

  describe('with default completed statuses', () => {
    const completedStatuses: TaskStatus[] = ['done', 'archived'];

    it('should filter out done and archived tasks by default', () => {
      const result = filterTasks(tasks, completedStatuses, false);

      expect(result).toHaveLength(4);
      expect(result.map(t => t.name)).toEqual([
        'Active Task 1',
        'Active Task 2',
        'Backlog Task',
        'On Hold Task',
      ]);
    });

    it('should show all tasks when showAll is true', () => {
      const result = filterTasks(tasks, completedStatuses, true);

      expect(result).toHaveLength(6);
      expect(result.map(t => t.name)).toContain('Done Task');
      expect(result.map(t => t.name)).toContain('Archived Task');
    });
  });

  describe('with custom completed statuses', () => {
    it('should respect custom completed statuses', () => {
      const customCompleted: TaskStatus[] = ['done', 'archived', 'on hold'];
      const result = filterTasks(tasks, customCompleted, false);

      expect(result).toHaveLength(3);
      expect(result.map(t => t.name)).toEqual([
        'Active Task 1',
        'Active Task 2',
        'Backlog Task',
      ]);
    });

    it('should handle empty completed statuses (show all)', () => {
      const result = filterTasks(tasks, [], false);

      expect(result).toHaveLength(6);
    });
  });

  describe('edge cases', () => {
    it('should handle empty task list', () => {
      const result = filterTasks([], ['done', 'archived'], false);
      expect(result).toHaveLength(0);
    });

    it('should handle all tasks being completed', () => {
      const allCompleted = [
        createTask('Done 1', 'done'),
        createTask('Done 2', 'archived'),
      ];
      const result = filterTasks(allCompleted, ['done', 'archived'], false);
      expect(result).toHaveLength(0);
    });
  });
});
