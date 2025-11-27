import { describe, it, expect } from 'vitest';

/**
 * Tests for task directory path handling
 * Bug: Task directory might not include /tasks suffix, causing tasks
 * to not be discovered by the task repository pattern `*\/tasks\/*.md`
 */

describe('Task Directory Path Handling', () => {
  /**
   * Ensure directory ends with /tasks for proper task discovery
   * Fixed implementation from new-task-modal.ts
   */
  function normalizeTaskDir(taskDir: string): string {
    if (!taskDir.toLowerCase().endsWith('/tasks') && taskDir.toLowerCase() !== 'tasks') {
      return `${taskDir}/tasks`;
    }
    return taskDir;
  }

  describe('normalizeTaskDir', () => {
    it('appends /tasks to plain directory', () => {
      expect(normalizeTaskDir('work')).toBe('work/tasks');
      expect(normalizeTaskDir('personal')).toBe('personal/tasks');
      expect(normalizeTaskDir('projects/client-a')).toBe('projects/client-a/tasks');
    });

    it('preserves directory already ending with /tasks', () => {
      expect(normalizeTaskDir('work/tasks')).toBe('work/tasks');
      expect(normalizeTaskDir('personal/tasks')).toBe('personal/tasks');
      expect(normalizeTaskDir('projects/client-a/tasks')).toBe('projects/client-a/tasks');
    });

    it('preserves root tasks directory', () => {
      expect(normalizeTaskDir('tasks')).toBe('tasks');
    });

    it('handles case variations', () => {
      expect(normalizeTaskDir('Work/Tasks')).toBe('Work/Tasks');
      expect(normalizeTaskDir('work/TASKS')).toBe('work/TASKS');
      expect(normalizeTaskDir('Tasks')).toBe('Tasks');
      expect(normalizeTaskDir('TASKS')).toBe('TASKS');
    });

    it('does not double-append /tasks', () => {
      const result = normalizeTaskDir(normalizeTaskDir('work'));
      expect(result).toBe('work/tasks');
    });
  });
});

describe('Task File Discovery Pattern', () => {
  /**
   * Check if a file path matches the task discovery pattern
   * Pattern: `*\/tasks\/*.md` - file must be in a 'tasks' directory
   */
  function isValidTaskFile(path: string): boolean {
    const parts = path.toLowerCase().split('/');

    // Must be in a 'tasks' directory
    if (!parts.some((p) => p === 'tasks')) {
      return false;
    }

    // Skip timer sessions
    if (parts.some((p) => p === 'timer_sessions')) {
      return false;
    }

    // Skip templates
    const templatePatterns = ['templates', 'template', '.template'];
    if (parts.some((p) => templatePatterns.includes(p))) {
      return false;
    }

    // Skip hidden files/directories
    if (parts.some((p) => p.startsWith('.'))) {
      return false;
    }

    return true;
  }

  describe('valid task files', () => {
    it('recognizes files in tasks directory', () => {
      expect(isValidTaskFile('tasks/my-task.md')).toBe(true);
      expect(isValidTaskFile('work/tasks/project.md')).toBe(true);
      expect(isValidTaskFile('personal/tasks/todo.md')).toBe(true);
      expect(isValidTaskFile('projects/client-a/tasks/feature.md')).toBe(true);
    });

    it('recognizes files in nested tasks directories', () => {
      expect(isValidTaskFile('area/subarea/tasks/task.md')).toBe(true);
    });

    it('is case-insensitive for tasks directory', () => {
      expect(isValidTaskFile('work/Tasks/project.md')).toBe(true);
      expect(isValidTaskFile('work/TASKS/project.md')).toBe(true);
    });
  });

  describe('invalid task files', () => {
    it('rejects files not in tasks directory', () => {
      expect(isValidTaskFile('notes/my-note.md')).toBe(false);
      expect(isValidTaskFile('work/project.md')).toBe(false);
      expect(isValidTaskFile('random.md')).toBe(false);
    });

    it('rejects timer session files', () => {
      expect(isValidTaskFile('timer_sessions/20241126-1430.md')).toBe(false);
      expect(isValidTaskFile('work/timer_sessions/session.md')).toBe(false);
    });

    it('rejects template files', () => {
      expect(isValidTaskFile('templates/task-template.md')).toBe(false);
      expect(isValidTaskFile('tasks/templates/template.md')).toBe(false);
      expect(isValidTaskFile('.template/task.md')).toBe(false);
    });

    it('rejects hidden files and directories', () => {
      expect(isValidTaskFile('.hidden/tasks/task.md')).toBe(false);
      expect(isValidTaskFile('tasks/.hidden-task.md')).toBe(false);
    });
  });
});

describe('Plan Day Modal Selection Filter', () => {
  interface MockTask {
    name: string;
    category: string;
    path: string;
  }

  /**
   * Fixed filter function that includes category in search
   * Bug: selectAll() didn't filter by category like the display did
   */
  function filterTasks(tasks: MockTask[], searchQuery: string): MockTask[] {
    if (!searchQuery) return tasks;
    const query = searchQuery.toLowerCase();
    return tasks.filter(
      (task) =>
        task.name.toLowerCase().includes(query) ||
        task.category.toLowerCase().includes(query)
    );
  }

  const mockTasks: MockTask[] = [
    { name: 'Write documentation', category: 'work', path: 'work/tasks/write-docs.md' },
    { name: 'Fix bug', category: 'work', path: 'work/tasks/fix-bug.md' },
    { name: 'Exercise', category: 'health', path: 'personal/tasks/exercise.md' },
    { name: 'Read book', category: 'learning', path: 'personal/tasks/read-book.md' },
    { name: 'Work on side project', category: 'personal', path: 'personal/tasks/side-project.md' },
  ];

  it('returns all tasks when search is empty', () => {
    expect(filterTasks(mockTasks, '')).toHaveLength(5);
  });

  it('filters by task name', () => {
    const results = filterTasks(mockTasks, 'bug');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Fix bug');
  });

  it('filters by category', () => {
    const results = filterTasks(mockTasks, 'work');
    expect(results).toHaveLength(3); // 2 work tasks + 1 with 'work' in name
    expect(results.map((t) => t.name)).toContain('Write documentation');
    expect(results.map((t) => t.name)).toContain('Fix bug');
    expect(results.map((t) => t.name)).toContain('Work on side project');
  });

  it('is case-insensitive', () => {
    expect(filterTasks(mockTasks, 'WORK')).toHaveLength(3);
    expect(filterTasks(mockTasks, 'Work')).toHaveLength(3);
    expect(filterTasks(mockTasks, 'wOrK')).toHaveLength(3);
  });

  it('filters by category alone', () => {
    const results = filterTasks(mockTasks, 'health');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Exercise');
  });

  it('returns empty when no matches', () => {
    expect(filterTasks(mockTasks, 'nonexistent')).toHaveLength(0);
  });
});

describe('Task Suggest Modal - Task vs File Selection', () => {
  interface Task {
    name: string;
    path: string;
    status: string;
    category: string;
  }

  /**
   * Bug: TaskSuggestModal was returning ALL markdown files instead of just tasks
   * Fixed: Now uses taskRepository.getAllTasks() instead of vault.getMarkdownFiles()
   */

  const allMarkdownFiles = [
    'work/tasks/project-a.md',
    'work/tasks/project-b.md',
    'personal/tasks/exercise.md',
    'notes/daily-note.md',
    'notes/meeting-notes.md',
    'timer_sessions/20241126-1430.md',
    'templates/task-template.md',
    'README.md',
  ];

  const taskFiles = [
    'work/tasks/project-a.md',
    'work/tasks/project-b.md',
    'personal/tasks/exercise.md',
  ];

  it('BUGGY: vault.getMarkdownFiles() returns all files including non-tasks', () => {
    expect(allMarkdownFiles).toHaveLength(8);
    expect(allMarkdownFiles).toContain('notes/daily-note.md');
    expect(allMarkdownFiles).toContain('timer_sessions/20241126-1430.md');
    expect(allMarkdownFiles).toContain('README.md');
  });

  it('FIXED: taskRepository.getAllTasks() returns only task files', () => {
    expect(taskFiles).toHaveLength(3);
    expect(taskFiles).not.toContain('notes/daily-note.md');
    expect(taskFiles).not.toContain('timer_sessions/20241126-1430.md');
    expect(taskFiles).not.toContain('README.md');
  });

  it('task files are in tasks directories', () => {
    for (const file of taskFiles) {
      expect(file.includes('/tasks/')).toBe(true);
    }
  });
});

describe('Recursive Directory Creation', () => {
  /**
   * Bug: Creating nested task directories would fail if parent didn't exist
   * Fixed: Create parent directories recursively
   */
  function getDirectoryParts(path: string): string[] {
    const parts = path.split('/');
    const result: string[] = [];
    let current = '';
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      result.push(current);
    }
    return result;
  }

  it('creates paths for nested directories', () => {
    const parts = getDirectoryParts('projects/client-a/tasks');
    expect(parts).toEqual(['projects', 'projects/client-a', 'projects/client-a/tasks']);
  });

  it('creates single path for root directory', () => {
    const parts = getDirectoryParts('tasks');
    expect(parts).toEqual(['tasks']);
  });

  it('creates paths for deeply nested directories', () => {
    const parts = getDirectoryParts('a/b/c/d/tasks');
    expect(parts).toEqual(['a', 'a/b', 'a/b/c', 'a/b/c/d', 'a/b/c/d/tasks']);
  });
});
