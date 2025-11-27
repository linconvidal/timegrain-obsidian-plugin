import { App, FuzzySuggestModal } from 'obsidian';
import type TimegrainPlugin from '../main';
import type { Task } from '../types';

/**
 * Fuzzy search modal for selecting a task to start the timer
 */
export class TaskSuggestModal extends FuzzySuggestModal<Task> {
  private tasks: Task[] = [];
  private showAll = false;
  private filterBtn: HTMLButtonElement | null = null;

  constructor(
    app: App,
    private plugin: TimegrainPlugin
  ) {
    super(app);
    this.setPlaceholder('Select a task to start timer...');
    this.loadTasks();
  }

  private loadTasks(): void {
    const allTasks = this.plugin.taskRepository.getAllTasks();
    const completedStatuses = this.plugin.settings.completedStatuses;

    this.tasks = this.showAll
      ? allTasks
      : allTasks.filter((t) => !completedStatuses.includes(t.status));
  }

  onOpen(): void {
    super.onOpen();

    // Create a filter bar between input and results
    const resultsContainer = this.modalEl.querySelector('.prompt-results');
    if (resultsContainer) {
      const filterBar = document.createElement('div');
      filterBar.className = 'timegrain-filter-bar';

      this.filterBtn = document.createElement('button');
      this.filterBtn.textContent = 'Show All';
      this.filterBtn.className = 'timegrain-filter-toggle';
      filterBar.appendChild(this.filterBtn);

      // Insert before results container
      resultsContainer.insertAdjacentElement('beforebegin', filterBar);

      this.filterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.showAll = !this.showAll;
        this.loadTasks();
        if (this.filterBtn) {
          this.filterBtn.textContent = this.showAll ? 'Active Only' : 'Show All';
          this.filterBtn.classList.toggle('is-active', this.showAll);
        }
        // Trigger re-render of suggestions by dispatching input event
        this.inputEl.dispatchEvent(new Event('input'));
      });
    }
  }

  getItems(): Task[] {
    return this.tasks;
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
