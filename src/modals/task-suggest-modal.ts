import { App, FuzzySuggestModal } from 'obsidian';
import type TimegrainPlugin from '../main';
import type { Task, TaskStatus } from '../types';

/** Filter state for task suggest modal */
interface FilterState {
  showAll: boolean;
  statuses: Set<TaskStatus>;
  areas: Set<string>;
  categories: Set<string>;
  sizeFilter: 'all' | 'quick' | 'deep';
  needsAttention: boolean;
  freshOnly: boolean;
}

/** Status options for filter chips */
const STATUS_CHIPS: TaskStatus[] = ['today', 'in progress', 'this week', 'backlog'];

/** Threshold for quick vs deep tasks (in pomodoros) */
const QUICK_TASK_THRESHOLD = 2;

/** Days to consider a task "fresh" */
const FRESH_DAYS = 7;

/**
 * Fuzzy search modal for selecting a task to start the timer
 */
export class TaskSuggestModal extends FuzzySuggestModal<Task> {
  private allTasks: Task[] = [];
  private filteredTasks: Task[] = [];
  private filters: FilterState = {
    showAll: false,
    statuses: new Set(),
    areas: new Set(),
    categories: new Set(),
    sizeFilter: 'all',
    needsAttention: false,
    freshOnly: false,
  };

  private filterBarEl: HTMLElement | null = null;

  constructor(
    app: App,
    private plugin: TimegrainPlugin
  ) {
    super(app);
    this.setPlaceholder('Search tasks...');
    this.allTasks = this.plugin.taskRepository.getAllTasks();
    this.applyFilters();
  }

  private applyFilters(): void {
    const completedStatuses = this.plugin.settings.completedStatuses;
    const weekAgo = Date.now() - FRESH_DAYS * 24 * 60 * 60 * 1000;

    this.filteredTasks = this.allTasks.filter((task) => {
      // Exclude completed (unless showAll)
      if (!this.filters.showAll && completedStatuses.includes(task.status)) {
        return false;
      }

      // Status filter (if any selected)
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

      // Needs attention (over budget)
      if (this.filters.needsAttention && task.actualPoms < task.estimation) {
        return false;
      }

      // Fresh (modified recently)
      if (this.filters.freshOnly && task.modificationDate < weekAgo) {
        return false;
      }

      return true;
    });
  }

  private refreshResults(): void {
    this.applyFilters();
    this.inputEl.dispatchEvent(new Event('input'));
  }

  private createChip(
    parent: HTMLElement,
    label: string,
    isActive: () => boolean,
    onClick: () => void
  ): HTMLButtonElement {
    const chip = parent.createEl('button', {
      text: label,
      cls: 'timegrain-filter-chip',
    });
    if (isActive()) chip.classList.add('is-active');

    chip.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
      chip.classList.toggle('is-active', isActive());
      this.refreshResults();
    });

    return chip;
  }

  private createToggle(
    parent: HTMLElement,
    label: string,
    isActive: () => boolean,
    onClick: () => void
  ): HTMLElement {
    const wrapper = parent.createEl('div', { cls: 'timegrain-toggle-wrapper' });

    const toggle = wrapper.createEl('button', { cls: 'timegrain-toggle' });
    if (isActive()) toggle.classList.add('is-active');

    wrapper.createEl('span', { text: label, cls: 'timegrain-toggle-label' });

    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
      toggle.classList.toggle('is-active', isActive());
      this.refreshResults();
    });

    return wrapper;
  }

  private createSelect(
    parent: HTMLElement,
    placeholder: string,
    options: string[],
    selected: Set<string>,
    onChange: (value: string) => void
  ): HTMLSelectElement {
    const select = parent.createEl('select', { cls: 'timegrain-filter-select' });
    select.createEl('option', { text: placeholder, value: '' });

    for (const opt of options) {
      if (opt) {
        const option = select.createEl('option', { text: opt, value: opt });
        if (selected.has(opt)) option.selected = true;
      }
    }

    select.addEventListener('change', (e) => {
      e.stopPropagation();
      onChange(select.value);
      this.refreshResults();
    });

    return select;
  }

  onOpen(): void {
    super.onOpen();

    const resultsContainer = this.modalEl.querySelector('.prompt-results');
    if (!resultsContainer) return;

    // Create filter bar
    this.filterBarEl = document.createElement('div');
    this.filterBarEl.className = 'timegrain-filter-bar';
    resultsContainer.insertAdjacentElement('beforebegin', this.filterBarEl);

    // Row 1: Status chips + toggle
    const row1 = this.filterBarEl.createEl('div', { cls: 'timegrain-filter-row timegrain-filter-row-split' });

    const statusGroup = row1.createEl('div', { cls: 'timegrain-filter-group' });
    for (const status of STATUS_CHIPS) {
      this.createChip(
        statusGroup,
        status,
        () => this.filters.statuses.has(status),
        () => {
          if (this.filters.statuses.has(status)) {
            this.filters.statuses.delete(status);
          } else {
            this.filters.statuses.add(status);
          }
        }
      );
    }

    // Toggle for completed
    this.createToggle(
      row1,
      'completed',
      () => this.filters.showAll,
      () => {
        this.filters.showAll = !this.filters.showAll;
      }
    );

    // Row 2: Size + special filters + dropdowns
    const row2 = this.filterBarEl.createEl('div', { cls: 'timegrain-filter-row' });

    // Size chips
    let quickChip: HTMLButtonElement;
    let deepChip: HTMLButtonElement;

    quickChip = this.createChip(
      row2,
      `≤${QUICK_TASK_THRESHOLD}`,
      () => this.filters.sizeFilter === 'quick',
      () => {
        this.filters.sizeFilter = this.filters.sizeFilter === 'quick' ? 'all' : 'quick';
        deepChip.classList.remove('is-active');
      }
    );

    deepChip = this.createChip(
      row2,
      `>${QUICK_TASK_THRESHOLD}`,
      () => this.filters.sizeFilter === 'deep',
      () => {
        this.filters.sizeFilter = this.filters.sizeFilter === 'deep' ? 'all' : 'deep';
        quickChip.classList.remove('is-active');
      }
    );

    // Dot separator
    row2.createEl('span', { cls: 'timegrain-filter-dot' });

    // Special filters
    this.createChip(
      row2,
      'over budget',
      () => this.filters.needsAttention,
      () => {
        this.filters.needsAttention = !this.filters.needsAttention;
      }
    );

    this.createChip(
      row2,
      'fresh',
      () => this.filters.freshOnly,
      () => {
        this.filters.freshOnly = !this.filters.freshOnly;
      }
    );

    // Spacer
    row2.createEl('div', { cls: 'timegrain-filter-spacer' });

    // Dropdowns
    const areas = [...new Set(this.allTasks.map((t) => t.area))].filter(Boolean).sort();
    const categories = [...new Set(this.allTasks.map((t) => t.category))].filter(Boolean).sort();

    if (areas.length > 0) {
      this.createSelect(row2, 'Area', areas, this.filters.areas, (value) => {
        this.filters.areas.clear();
        if (value) this.filters.areas.add(value);
      });
    }

    if (categories.length > 0) {
      this.createSelect(row2, 'Category', categories, this.filters.categories, (value) => {
        this.filters.categories.clear();
        if (value) this.filters.categories.add(value);
      });
    }
  }

  getItems(): Task[] {
    return this.filteredTasks;
  }

  getItemText(task: Task): string {
    return `${task.title || task.name} ${task.category} ${task.area}`;
  }

  renderSuggestion(match: { item: Task; match: { score: number } }, el: HTMLElement): void {
    const task = match.item;
    const container = el.createDiv({ cls: 'timegrain-suggest-item' });
    container.createDiv({ text: task.title || task.name, cls: 'timegrain-suggest-title' });

    const meta = container.createDiv({ cls: 'timegrain-suggest-meta' });
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

  async onChooseItem(task: Task, _evt: MouseEvent | KeyboardEvent): Promise<void> {
    await this.plugin.timerService.start(task.name, task.path);
  }
}
