import { App, TFile, TFolder, Events } from 'obsidian';
import type { Task, TaskFrontmatter, TaskStatus, TimegrainSettings } from '../types';
import { readFrontmatter, updateFrontmatter, safeInt, safeString } from './frontmatter';
import { formatDateOnly } from '../utils/datetime';

/**
 * Repository for task file operations with caching
 */
export class TaskRepository extends Events {
  private tasks: Map<string, Task> = new Map();
  private initialized = false;
  private refreshPromise: Promise<void> | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private eventRefs: ReturnType<typeof this.app.vault.on>[] = [];

  private readonly DEBOUNCE_MS = 300;
  private readonly BATCH_SIZE = 50;

  constructor(
    private app: App,
    private settings: TimegrainSettings
  ) {
    super();
  }

  /**
   * Clean up event listeners and timers
   */
  destroy(): void {
    // Clear debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    // Unregister file watchers
    for (const ref of this.eventRefs) {
      this.app.vault.offref(ref);
    }
    this.eventRefs = [];
  }

  /**
   * Initialize the task cache
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.refreshAll();
    this.registerFileWatchers();
    this.initialized = true;
  }

  /**
   * Refresh all tasks in batches
   */
  async refreshAll(): Promise<void> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.doRefreshAll();

    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async doRefreshAll(): Promise<void> {
    const files = Array.from(this.iterTaskFiles());
    const newTasks = new Map<string, Task>();

    // Process in batches to avoid blocking UI
    for (let i = 0; i < files.length; i += this.BATCH_SIZE) {
      const batch = files.slice(i, i + this.BATCH_SIZE);

      await Promise.all(
        batch.map(async (file) => {
          const task = await this.processTaskFile(file);
          if (task) {
            newTasks.set(file.path, task);
          }
        })
      );

      // Yield to event loop between batches
      if (i + this.BATCH_SIZE < files.length) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    this.tasks = newTasks;
    this.trigger('tasks-updated');
  }

  /**
   * Iterate over all task files in the vault
   */
  *iterTaskFiles(): Generator<TFile> {
    const files = this.app.vault.getMarkdownFiles();

    for (const file of files) {
      if (this.isValidTaskFile(file.path)) {
        yield file;
      }
    }
  }

  /**
   * Check if a file path is a valid task file
   */
  private isValidTaskFile(path: string): boolean {
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

  /**
   * Process a single task file into a Task object
   */
  private async processTaskFile(file: TFile): Promise<Task | null> {
    const frontmatter = await readFrontmatter<TaskFrontmatter>(this.app, file);
    if (!frontmatter) return null;

    const status = (safeString(frontmatter.status, 'not started').toLowerCase() as TaskStatus);
    // Check both field names (underscore and space), prefer underscore
    const expectedEnergy = frontmatter.expected_energy != null
      ? safeInt(frontmatter.expected_energy)
      : safeInt(frontmatter['expected energy'], 0);

    return {
      path: file.path,
      name: file.basename,
      title: safeString(frontmatter.title) || file.basename,
      status,
      estimation: safeInt(frontmatter.estimation, 1),
      actualPoms: 0, // Will be computed from sessions
      expectedEnergy,
      area: this.extractAreaFromPath(file.path),
      category: safeString(frontmatter.category),
      modificationDate: file.stat.mtime,
      file,
    };
  }

  /**
   * Extract area name from task path
   * Area is the directory immediately before 'tasks' in the path
   */
  extractAreaFromPath(path: string): string {
    const parts = path.split('/');
    const tasksIndex = parts.findIndex((p) => p.toLowerCase() === 'tasks');

    if (tasksIndex <= 0) {
      return 'General';
    }

    let area = parts[tasksIndex - 1]
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    // Check blacklist
    const areaLower = area.toLowerCase();
    const isBlacklisted =
      this.settings.areaBlacklist.some((item) => item.toLowerCase() === areaLower) ||
      /^\d+\./.test(areaLower) ||
      areaLower.endsWith('.md');

    return isBlacklisted ? 'Other' : area;
  }

  /**
   * Register file watchers for real-time updates
   */
  private registerFileWatchers(): void {
    this.eventRefs.push(
      this.app.vault.on('modify', (file) => {
        if (file instanceof TFile && this.isValidTaskFile(file.path)) {
          this.debouncedRefresh(file);
        }
      })
    );

    this.eventRefs.push(
      this.app.vault.on('create', (file) => {
        if (file instanceof TFile && this.isValidTaskFile(file.path)) {
          this.debouncedRefresh(file);
        }
      })
    );

    this.eventRefs.push(
      this.app.vault.on('delete', (file) => {
        if (file instanceof TFile) {
          this.tasks.delete(file.path);
          this.trigger('tasks-updated');
        }
      })
    );

    this.eventRefs.push(
      this.app.vault.on('rename', (file, oldPath) => {
        if (file instanceof TFile) {
          this.tasks.delete(oldPath);
          if (this.isValidTaskFile(file.path)) {
            this.debouncedRefresh(file);
          } else {
            this.trigger('tasks-updated');
          }
        }
      })
    );
  }

  /**
   * Debounced single-file refresh
   */
  private debouncedRefresh(file: TFile): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(async () => {
      const task = await this.processTaskFile(file);
      if (task) {
        this.tasks.set(file.path, task);
      } else {
        this.tasks.delete(file.path);
      }
      this.trigger('tasks-updated');
    }, this.DEBOUNCE_MS);
  }

  // ============================================================================
  // Query Methods
  // ============================================================================

  /**
   * Get all cached tasks
   */
  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Alias for getAllTasks
   */
  async getTasks(): Promise<Task[]> {
    return this.getAllTasks();
  }

  /**
   * Refresh the task cache
   */
  async refreshCache(): Promise<void> {
    await this.refreshAll();
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status: TaskStatus): Task[] {
    return this.getAllTasks().filter((t) => t.status === status);
  }

  /**
   * Get tasks by statuses (multiple)
   */
  getTasksByStatuses(statuses: TaskStatus[]): Task[] {
    const statusSet = new Set(statuses);
    return this.getAllTasks().filter((t) => statusSet.has(t.status));
  }

  /**
   * Find a task by name
   */
  findTaskByName(name: string): Task | undefined {
    return this.getAllTasks().find((t) => t.name === name);
  }

  /**
   * Find a task by path
   */
  findTaskByPath(path: string): Task | undefined {
    return this.tasks.get(path);
  }

  /**
   * Group tasks by status
   */
  getTasksGroupedByStatus(): Record<TaskStatus, Task[]> {
    const grouped: Record<string, Task[]> = {};

    for (const task of this.getAllTasks()) {
      if (!grouped[task.status]) {
        grouped[task.status] = [];
      }
      grouped[task.status].push(task);
    }

    return grouped as Record<TaskStatus, Task[]>;
  }

  // ============================================================================
  // Mutation Methods
  // ============================================================================

  /**
   * Update a task's status
   */
  async updateTaskStatus(task: Task, newStatus: TaskStatus): Promise<void> {
    await updateFrontmatter(this.app, task.file, {
      status: newStatus,
      'modification date': formatDateOnly(new Date()),
    });

    // Update cache
    task.status = newStatus;
    task.modificationDate = Date.now();
    this.trigger('tasks-updated');
  }

  /**
   * Update actual pomodoros for a task (computed from sessions)
   */
  updateTaskActualPoms(taskName: string, actualPoms: number): void {
    const task = this.findTaskByName(taskName);
    if (task) {
      task.actualPoms = actualPoms;
    }
  }

  /**
   * Rollover stale 'today' tasks to 'this week'
   */
  async rolloverStaleTasks(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let rolloverCount = 0;
    const todayTasks = this.getTasksByStatus('today');

    for (const task of todayTasks) {
      const mtime = new Date(task.modificationDate);
      mtime.setHours(0, 0, 0, 0);

      if (mtime < today) {
        await this.updateTaskStatus(task, 'this week');
        rolloverCount++;
      }
    }

    return rolloverCount;
  }
}
