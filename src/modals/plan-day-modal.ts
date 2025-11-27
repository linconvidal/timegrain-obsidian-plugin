import { App, Modal, Notice } from 'obsidian';
import type TimegrainPlugin from '../main';
import type { Task, TaskStatus } from '../types';
import { formatPomodoros } from '../utils/formatters';

const PLANNABLE_STATUSES: TaskStatus[] = ['this week', 'this month', 'backlog', 'not started'];

/**
 * Modal for planning the day - selecting tasks to move to "Today"
 */
export class PlanDayModal extends Modal {
  private tasks: Task[] = [];
  private selectedPaths: Set<string> = new Set();
  private searchQuery = '';
  private listContainer: HTMLElement | null = null;

  constructor(
    app: App,
    private plugin: TimegrainPlugin
  ) {
    super(app);
  }

  async onOpen(): Promise<void> {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('timegrain-plan-day-modal');

    contentEl.createEl('h2', { text: 'Plan Your Day' });
    contentEl.createEl('p', {
      text: 'Select tasks to move to "Today"',
      cls: 'timegrain-modal-subtitle',
    });

    // Search input
    const searchContainer = contentEl.createDiv('timegrain-search-container');
    const searchInput = searchContainer.createEl('input', {
      type: 'text',
      placeholder: 'Search tasks...',
      cls: 'timegrain-search-input',
    });
    searchInput.addEventListener('input', (e) => {
      this.searchQuery = (e.target as HTMLInputElement).value.toLowerCase();
      this.renderTaskList();
    });

    // Task list container
    this.listContainer = contentEl.createDiv('timegrain-plan-task-list');

    // Load and render tasks
    await this.loadTasks();
    this.renderTaskList();

    // Buttons
    const buttonContainer = contentEl.createDiv('timegrain-modal-buttons');

    const selectAllBtn = buttonContainer.createEl('button', {
      text: 'Select All',
      cls: 'timegrain-btn timegrain-btn-secondary',
    });
    selectAllBtn.addEventListener('click', () => this.selectAll());

    const clearBtn = buttonContainer.createEl('button', {
      text: 'Clear Selection',
      cls: 'timegrain-btn timegrain-btn-secondary',
    });
    clearBtn.addEventListener('click', () => this.clearSelection());

    const moveBtn = buttonContainer.createEl('button', {
      text: 'Move to Today',
      cls: 'timegrain-btn timegrain-btn-primary',
    });
    moveBtn.addEventListener('click', () => this.moveToToday());
  }

  private async loadTasks(): Promise<void> {
    const allTasks = await this.plugin.taskRepository.getTasks();
    this.tasks = allTasks
      .filter((task) => PLANNABLE_STATUSES.includes(task.status))
      .sort((a, b) => {
        // Sort by status priority, then alphabetically
        const statusOrder = PLANNABLE_STATUSES.indexOf(a.status) - PLANNABLE_STATUSES.indexOf(b.status);
        if (statusOrder !== 0) return statusOrder;
        return a.name.localeCompare(b.name);
      });
  }

  private renderTaskList(): void {
    if (!this.listContainer) return;
    this.listContainer.empty();

    const filteredTasks = this.tasks.filter((task) =>
      task.name.toLowerCase().includes(this.searchQuery) ||
      task.category.toLowerCase().includes(this.searchQuery)
    );

    if (filteredTasks.length === 0) {
      this.listContainer.createEl('p', {
        text: this.searchQuery ? 'No matching tasks found' : 'No tasks available for planning',
        cls: 'timegrain-empty-state',
      });
      return;
    }

    filteredTasks.forEach((task) => {
      const isSelected = this.selectedPaths.has(task.path);
      const item = this.listContainer!.createDiv({
        cls: `timegrain-plan-task-item ${isSelected ? 'selected' : ''}`,
      });

      // Checkbox
      const checkbox = item.createEl('input', {
        type: 'checkbox',
        cls: 'timegrain-plan-checkbox',
      });
      checkbox.checked = isSelected;
      checkbox.addEventListener('change', () => {
        this.toggleTask(task.path);
      });

      // Task info container
      const info = item.createDiv('timegrain-plan-task-info');

      // First row: status badge and task name
      const row1 = info.createDiv('timegrain-plan-task-row');
      row1.createEl('span', {
        text: task.status,
        cls: `timegrain-status-badge timegrain-status-${task.status.replace(/\s+/g, '-')}`,
      });
      row1.createEl('span', {
        text: task.name,
        cls: 'timegrain-plan-task-name',
      });

      // Second row: category and estimation
      const row2 = info.createDiv('timegrain-plan-task-meta');
      if (task.category) {
        row2.createEl('span', {
          text: task.category,
          cls: 'timegrain-task-category',
        });
      }
      row2.createEl('span', {
        text: `${task.actualPoms}/${task.estimation} poms`,
        cls: 'timegrain-task-poms',
      });

      // Click on item to toggle
      item.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).tagName !== 'INPUT') {
          this.toggleTask(task.path);
        }
      });
    });

    // Update selection count
    this.updateSelectionCount();
  }

  private toggleTask(path: string): void {
    if (this.selectedPaths.has(path)) {
      this.selectedPaths.delete(path);
    } else {
      this.selectedPaths.add(path);
    }
    this.renderTaskList();
  }

  private selectAll(): void {
    const filteredTasks = this.tasks.filter((task) =>
      task.name.toLowerCase().includes(this.searchQuery) ||
      task.category.toLowerCase().includes(this.searchQuery)
    );
    filteredTasks.forEach((task) => this.selectedPaths.add(task.path));
    this.renderTaskList();
  }

  private clearSelection(): void {
    this.selectedPaths.clear();
    this.renderTaskList();
  }

  private updateSelectionCount(): void {
    const moveBtn = this.contentEl.querySelector('.timegrain-btn-primary');
    if (moveBtn) {
      const count = this.selectedPaths.size;
      moveBtn.textContent = count > 0 ? `Move ${count} to Today` : 'Move to Today';
    }
  }

  private async moveToToday(): Promise<void> {
    if (this.selectedPaths.size === 0) {
      new Notice('No tasks selected');
      return;
    }

    try {
      const selectedTasks = this.tasks.filter((t) => this.selectedPaths.has(t.path));

      for (const task of selectedTasks) {
        await this.plugin.taskRepository.updateTaskStatus(task, 'today');
      }

      new Notice(`Moved ${selectedTasks.length} task(s) to Today`);
      this.close();
    } catch (error) {
      console.error('Failed to move tasks:', error);
      new Notice('Failed to move some tasks');
    }
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}
