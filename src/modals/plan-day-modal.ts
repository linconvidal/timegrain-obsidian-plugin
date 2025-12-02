import { App, SuggestModal, Notice } from 'obsidian';
import type TimegrainPlugin from '../main';
import type { Task, TaskStatus } from '../types';
import {
  createChip,
  createSelect,
  createFilterRow,
  createFilterGroup,
} from '../utils/filter-utils';

const PLANNABLE_STATUSES: TaskStatus[] = ['this week', 'this month', 'backlog', 'not started'];

/** Status chips for plan day modal */
const STATUS_CHIPS: TaskStatus[] = ['this week', 'this month', 'backlog'];

/** Threshold for quick vs deep tasks (in pomodoros) */
const QUICK_TASK_THRESHOLD = 2;

/** Filter state for plan day modal */
interface FilterState {
  statuses: Set<TaskStatus>;
  areas: Set<string>;
  categories: Set<string>;
  sizeFilter: 'all' | 'quick' | 'deep';
}

/**
 * Modal for planning the day - selecting tasks to move to "Today"
 * Extends SuggestModal to get native Obsidian prompt structure
 */
export class PlanDayModal extends SuggestModal<Task> {
  private allTasks: Task[] = [];
  private selectedPaths: Set<string> = new Set();
  private filters: FilterState = {
    statuses: new Set(),
    areas: new Set(),
    categories: new Set(),
    sizeFilter: 'all',
  };
  private filterBarEl: HTMLElement | null = null;
  private buttonContainer: HTMLElement | null = null;

  constructor(
    app: App,
    private plugin: TimegrainPlugin
  ) {
    super(app);
    this.setPlaceholder('Plan your day...');
  }

  async onOpen(): Promise<void> {
    // Load tasks before opening
    const allTasks = await this.plugin.taskRepository.getTasks();
    this.allTasks = allTasks
      .filter((task) => PLANNABLE_STATUSES.includes(task.status))
      .sort((a, b) => {
        const statusOrder = PLANNABLE_STATUSES.indexOf(a.status) - PLANNABLE_STATUSES.indexOf(b.status);
        if (statusOrder !== 0) return statusOrder;
        return a.name.localeCompare(b.name);
      });

    super.onOpen();

    // Add custom class for width
    this.modalEl.addClass('timegrain-plan-day-modal');

    const resultsContainer = this.modalEl.querySelector('.prompt-results');
    if (!resultsContainer) return;

    const refresh = () => {
      // Trigger re-render by dispatching input event
      this.inputEl.dispatchEvent(new Event('input'));
    };

    // Create filter bar (like TaskSuggestModal)
    this.filterBarEl = document.createElement('div');
    this.filterBarEl.className = 'timegrain-filter-bar';
    resultsContainer.insertAdjacentElement('beforebegin', this.filterBarEl);

    // Row 1: Status chips (left) + dropdowns (right)
    const row1 = createFilterRow(this.filterBarEl, true);
    const statusGroup = createFilterGroup(row1);

    for (const status of STATUS_CHIPS) {
      createChip(
        statusGroup,
        status,
        () => this.filters.statuses.has(status),
        () => {
          if (this.filters.statuses.has(status)) {
            this.filters.statuses.delete(status);
          } else {
            this.filters.statuses.add(status);
          }
        },
        refresh
      );
    }

    // Dropdowns on right side of row 1
    const dropdownGroup = createFilterGroup(row1);
    const areas = [...new Set(this.allTasks.map((t) => t.area))].filter(Boolean).sort();
    const categories = [...new Set(this.allTasks.map((t) => t.category))].filter(Boolean).sort();

    if (areas.length > 0) {
      createSelect(dropdownGroup, 'Area', areas, this.filters.areas, (value) => {
        this.filters.areas.clear();
        if (value) this.filters.areas.add(value);
      }, refresh);
    }

    if (categories.length > 0) {
      createSelect(dropdownGroup, 'Category', categories, this.filters.categories, (value) => {
        this.filters.categories.clear();
        if (value) this.filters.categories.add(value);
      }, refresh);
    }

    // Row 2: Size chips
    const row2 = createFilterRow(this.filterBarEl);

    let quickChip: HTMLButtonElement;
    let deepChip: HTMLButtonElement;

    quickChip = createChip(
      row2,
      `≤${QUICK_TASK_THRESHOLD}`,
      () => this.filters.sizeFilter === 'quick',
      () => {
        this.filters.sizeFilter = this.filters.sizeFilter === 'quick' ? 'all' : 'quick';
        deepChip.classList.remove('is-active');
      },
      refresh
    );

    deepChip = createChip(
      row2,
      `>${QUICK_TASK_THRESHOLD}`,
      () => this.filters.sizeFilter === 'deep',
      () => {
        this.filters.sizeFilter = this.filters.sizeFilter === 'deep' ? 'all' : 'deep';
        quickChip.classList.remove('is-active');
      },
      refresh
    );

    // Action buttons at bottom
    this.buttonContainer = document.createElement('div');
    this.buttonContainer.className = 'timegrain-modal-buttons';
    resultsContainer.insertAdjacentElement('afterend', this.buttonContainer);

    const selectAllBtn = this.buttonContainer.createEl('button', {
      text: 'Select All',
      cls: 'timegrain-btn timegrain-btn-secondary',
    });
    selectAllBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.selectAll();
      refresh();
    });

    const clearBtn = this.buttonContainer.createEl('button', {
      text: 'Clear Selection',
      cls: 'timegrain-btn timegrain-btn-secondary',
    });
    clearBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.clearSelection();
      refresh();
    });

    const moveBtn = this.buttonContainer.createEl('button', {
      text: 'Move to Today',
      cls: 'timegrain-btn timegrain-btn-primary',
    });
    moveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.moveToToday();
    });
  }

  getSuggestions(query: string): Task[] {
    const lowerQuery = query.toLowerCase();

    return this.allTasks.filter((task) => {
      // Search filter
      if (lowerQuery) {
        const matchesSearch =
          task.name.toLowerCase().includes(lowerQuery) ||
          task.category.toLowerCase().includes(lowerQuery);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (this.filters.statuses.size > 0 && !this.filters.statuses.has(task.status)) {
        return false;
      }

      // Area filter
      if (this.filters.areas.size > 0 && !this.filters.areas.has(task.area)) {
        return false;
      }

      // Category filter
      if (this.filters.categories.size > 0 && !this.filters.categories.has(task.category)) {
        return false;
      }

      // Size filter
      if (this.filters.sizeFilter === 'quick' && task.estimation > QUICK_TASK_THRESHOLD) {
        return false;
      }
      if (this.filters.sizeFilter === 'deep' && task.estimation <= QUICK_TASK_THRESHOLD) {
        return false;
      }

      return true;
    });
  }

  renderSuggestion(task: Task, el: HTMLElement): void {
    const isSelected = this.selectedPaths.has(task.path);

    el.addClass('timegrain-plan-item');
    if (isSelected) el.addClass('is-selected');

    // Checkbox
    const checkbox = el.createEl('input', {
      type: 'checkbox',
      cls: 'task-list-item-checkbox',
    });
    checkbox.checked = isSelected;
    checkbox.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    checkbox.addEventListener('change', (e) => {
      e.stopPropagation();
      this.toggleTask(task.path);
      // Re-render
      this.inputEl.dispatchEvent(new Event('input'));
    });

    // Content container
    const content = el.createDiv('timegrain-suggest-item');

    // Title
    content.createDiv({ text: task.title || task.name, cls: 'timegrain-suggest-title' });

    // Meta row
    const meta = content.createDiv({ cls: 'timegrain-suggest-meta' });
    meta.createEl('span', {
      text: task.status,
      cls: `timegrain-status-badge timegrain-status-${task.status.replace(/\s+/g, '-')}`,
    });
    if (task.category) {
      meta.createEl('span', { text: task.category, cls: 'timegrain-suggest-category' });
    }
    meta.createEl('span', {
      text: `${task.actualPoms}/${task.estimation} poms`,
      cls: 'timegrain-suggest-poms',
    });
  }

  onChooseSuggestion(task: Task, _evt: MouseEvent | KeyboardEvent): void {
    // Toggle selection instead of closing
    this.toggleTask(task.path);
    // Re-render and keep modal open
    this.inputEl.dispatchEvent(new Event('input'));
    // Prevent default close behavior by re-opening
    setTimeout(() => {
      if (!this.modalEl.isConnected) {
        this.open();
      }
    }, 0);
  }

  private toggleTask(path: string): void {
    if (this.selectedPaths.has(path)) {
      this.selectedPaths.delete(path);
    } else {
      this.selectedPaths.add(path);
    }
    this.updateSelectionCount();
  }

  private selectAll(): void {
    const suggestions = this.getSuggestions(this.inputEl.value);
    suggestions.forEach((task) => this.selectedPaths.add(task.path));
    this.updateSelectionCount();
  }

  private clearSelection(): void {
    this.selectedPaths.clear();
    this.updateSelectionCount();
  }

  private updateSelectionCount(): void {
    const moveBtn = this.buttonContainer?.querySelector('.timegrain-btn-primary');
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
      const selectedTasks = this.allTasks.filter((t) => this.selectedPaths.has(t.path));

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
}
