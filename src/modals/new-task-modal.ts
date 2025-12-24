import { App, Modal, Setting, Notice, type TextComponent } from 'obsidian';
import type TimegrainPlugin from '../main';
import type { TaskStatus } from '../types';
import { formatTaskDateTime } from '../utils/datetime';
import { slugify } from '../utils/formatters';

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'in progress', label: 'In Progress' },
  { value: 'this week', label: 'This Week' },
  { value: 'this month', label: 'This Month' },
  { value: 'backlog', label: 'Backlog' },
];

const ENERGY_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Any energy level' },
  { value: 2, label: 'Low energy' },
  { value: 3, label: 'Normal energy' },
  { value: 5, label: 'High energy' },
];

/**
 * Modal for creating a new task
 * Uses prompt structure for consistent close button styling
 */
export class NewTaskModal extends Modal {
  private title = '';
  private status: TaskStatus = 'today';
  private estimation = 1;
  private expectedEnergy = 0;
  private category = '';
  private taskScope = '';
  private tags = '';
  private metadataOptions = { categories: [] as string[], scopes: [] as string[], tags: [] as string[] };
  private datalistIdCounter = 0;
  private formContainer: HTMLElement | null = null;

  constructor(
    app: App,
    private plugin: TimegrainPlugin
  ) {
    super(app);
  }

  onOpen(): void {
    const { modalEl, contentEl } = this;

    // Use prompt structure for consistent close button (like SuggestModal)
    contentEl.hide();
    modalEl.addClass('prompt');
    modalEl.addClass('timegrain-new-task-modal');

    this.refreshMetadataOptions();

    // Create form container (insert before close button)
    const closeButton = modalEl.querySelector('.modal-close-button');
    this.formContainer = createDiv('timegrain-form-container');
    if (closeButton) {
      modalEl.insertBefore(this.formContainer, closeButton);
    } else {
      modalEl.appendChild(this.formContainer);
    }

    this.formContainer.createEl('h2', { text: 'Create New Task' });

    // Task title
    new Setting(this.formContainer)
      .setName('Task title')
      .setDesc('The name of your task')
      .addText((text) => {
        text
          .setPlaceholder('Enter task title...')
          .setValue(this.title)
          .onChange((value) => {
            this.title = value;
          });
        text.inputEl.focus();
        text.inputEl.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.createTask();
          }
        });
      });

    // Status dropdown
    new Setting(this.formContainer)
      .setName('Status')
      .setDesc('Initial status for the task')
      .addDropdown((dropdown) => {
        STATUS_OPTIONS.forEach((opt) => {
          dropdown.addOption(opt.value, opt.label);
        });
        dropdown.setValue(this.status);
        dropdown.onChange((value) => {
          this.status = value as TaskStatus;
        });
      });

    // Estimation
    new Setting(this.formContainer)
      .setName('Estimation')
      .setDesc('Estimated pomodoros to complete')
      .addText((text) => {
        text
          .setPlaceholder('1')
          .setValue(String(this.estimation))
          .onChange((value) => {
            const num = parseInt(value, 10);
            this.estimation = isNaN(num) || num < 1 ? 1 : num;
          });
        text.inputEl.type = 'number';
        text.inputEl.min = '1';
        text.inputEl.style.width = '80px';
      });

    // Expected energy
    new Setting(this.formContainer)
      .setName('Expected energy')
      .setDesc('Energy level needed for this task')
      .addDropdown((dropdown) => {
        ENERGY_OPTIONS.forEach((opt) => {
          dropdown.addOption(String(opt.value), opt.label);
        });
        dropdown.setValue(String(this.expectedEnergy));
        dropdown.onChange((value) => {
          this.expectedEnergy = parseInt(value, 10);
        });
      });

    // Category
    new Setting(this.formContainer)
      .setName('Category')
      .setDesc('Type to see suggestions from your vault')
      .addText((text) => {
        text
          .setPlaceholder('e.g., 🐞 debug / test, 📝 documentation')
          .setValue(this.category)
          .onChange((value) => {
            this.category = value;
          });
        this.attachAutocomplete(text, this.metadataOptions.categories);
      });

    // Scope
    new Setting(this.formContainer)
      .setName('Scope')
      .setDesc('Type to see suggestions from your vault')
      .addText((text) => {
        text
          .setPlaceholder('e.g., 🔑 Project Name')
          .setValue(this.taskScope)
          .onChange((value) => {
            this.taskScope = value;
          });
        this.attachAutocomplete(text, this.metadataOptions.scopes);
      });

    // Tags
    new Setting(this.formContainer)
      .setName('Tags')
      .setDesc('Comma-separated, type to see suggestions')
      .addText((text) => {
        text
          .setPlaceholder('e.g., urgent, review, backend')
          .setValue(this.tags)
          .onChange((value) => {
            this.tags = value;
          });
        this.attachAutocomplete(text, this.metadataOptions.tags);
      });

    // Buttons
    const buttonContainer = this.formContainer.createDiv('timegrain-modal-buttons');

    const cancelBtn = buttonContainer.createEl('button', {
      text: 'Cancel',
      cls: 'timegrain-btn timegrain-btn-secondary',
    });
    cancelBtn.addEventListener('click', () => this.close());

    const createBtn = buttonContainer.createEl('button', {
      text: 'Create Task',
      cls: 'timegrain-btn timegrain-btn-primary',
    });
    createBtn.addEventListener('click', () => this.createTask());
  }

  private refreshMetadataOptions(): void {
    this.metadataOptions = this.plugin.taskRepository.getMetadataOptions();
  }

  private attachAutocomplete(text: TextComponent, options: string[]): void {
    if (options.length === 0 || !this.formContainer) return;

    const datalistId = `timegrain-meta-${this.datalistIdCounter++}`;
    const datalist = this.formContainer.createEl('datalist', { attr: { id: datalistId } });

    options.forEach((option) => {
      datalist.createEl('option', { attr: { value: option } });
    });

    text.inputEl.setAttribute('list', datalistId);
  }

  private parseTagsInput(value: string): string[] {
    if (!value.trim()) return [];
    const parts = value
      .split(',')
      .map((tag) => tag.trim().replace(/^#/, ''))
      .filter(Boolean);
    return Array.from(new Set(parts));
  }

  private async createTask(): Promise<void> {
    if (!this.title.trim()) {
      new Notice('Please enter a task title');
      return;
    }

    try {
      const now = new Date();
      const slug = slugify(this.title);
      let taskDir = this.plugin.settings.defaultTaskDirectory;

      // Ensure directory ends with /tasks for proper task discovery
      if (!taskDir.toLowerCase().endsWith('/tasks') && taskDir.toLowerCase() !== 'tasks') {
        taskDir = `${taskDir}/tasks`;
      }

      // Ensure directory exists - create recursively if needed
      const dirExists = this.app.vault.getAbstractFileByPath(taskDir);
      if (!dirExists) {
        // Create parent directories if needed
        const parts = taskDir.split('/');
        let currentPath = '';
        for (const part of parts) {
          currentPath = currentPath ? `${currentPath}/${part}` : part;
          const existing = this.app.vault.getAbstractFileByPath(currentPath);
          if (!existing) {
            await this.app.vault.createFolder(currentPath);
          }
        }
      }

      // Generate unique filename with safeguard against infinite loops
      let filename = `${slug}.md`;
      let filepath = `${taskDir}/${filename}`;
      let counter = 1;
      const maxAttempts = 1000;

      while (this.app.vault.getAbstractFileByPath(filepath) && counter < maxAttempts) {
        filename = `${slug}-${counter}.md`;
        filepath = `${taskDir}/${filename}`;
        counter++;
      }

      if (counter >= maxAttempts) {
        new Notice('Could not generate unique filename');
        return;
      }

      const category = this.category.trim();
      const scope = this.taskScope.trim();
      const tags = this.parseTagsInput(this.tags);

      // Build frontmatter
      const frontmatter: Record<string, unknown> = {
        category: category || null,
        'creation date': formatTaskDateTime(now),
        'depends on': null,
        'due to': null,
        estimation: this.estimation,
        'expected energy': this.expectedEnergy > 0 ? this.expectedEnergy : null,
        goal: [],
        'modification date': formatTaskDateTime(now),
        scope: scope || null,
        status: this.status,
        tags,
      };

      // Build content with proper YAML escaping
      const frontmatterYaml = Object.entries(frontmatter)
        .map(([key, value]) => {
          if (value === null || value === undefined) {
            return `${key}:`;
          }
          if (Array.isArray(value)) {
            if (value.length === 0) {
              return `${key}:`;
            }
            const items = value.map((item) => `  - ${item}`).join('\n');
            return `${key}:\n${items}`;
          }
          if (typeof value === 'string') {
            // Quote strings that contain YAML special characters or start with special chars
            const needsQuoting = /[:\#\[\]\{\}\,\&\*\?\|\-\<\>\=\!\%\@\`\n]/.test(value) ||
              /^[\s'"]/.test(value) ||
              /[\s'"]$/.test(value) ||
              value === '' ||
              value === 'true' || value === 'false' ||
              value === 'null' || value === 'yes' || value === 'no';
            if (needsQuoting) {
              // Escape double quotes and backslashes inside the string
              const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
              return `${key}: "${escaped}"`;
            }
            return `${key}: ${value}`;
          }
          return `${key}: ${value}`;
        })
        .join('\n');

      const timerSessionsDir = this.plugin.settings.timerSessionsDir;

      const content = `---
${frontmatterYaml}
---


# Task context



# Task checklist

- [ ]

---

# Task outputs


---

# Task log

\`\`\`dataview
TABLE WITHOUT ID
  "**Total Time:**" as "",
  choice(
    sum(rows.duration_minutes) >= 60,
    floor(sum(rows.duration_minutes) / 60) + "h " + round(sum(rows.duration_minutes) % 60) + "m",
    round(sum(rows.duration_minutes)) + "m"
  ) as "Time Spent"
FROM "${timerSessionsDir}"
WHERE started AND ended AND contains(file.outlinks, this.file.link)
FLATTEN (number(dateformat(date(ended), "x")) - number(dateformat(date(started), "x"))) / (1000 * 60) as duration_minutes
GROUP BY true
\`\`\`

\`\`\`base
filters:
  and:
    - file.inFolder("${timerSessionsDir}")
    - file.ext == "md"
formulas:
  duration: ended-started
properties:
  started:
    displayName: Started at
  ended:
    displayName: Ended at
  formula.duration:
    displayName: Duration (min)
views:
  - type: table
    name: Timer sessions for this task
    filters:
      and:
        - file.hasLink(this.file)
    order:
      - file.name
      - started
      - ended
      - formula.duration
    sort:
      - column: file.name
        direction: DESC
      - column: note.ended
        direction: ASC
      - column: note.duration
        direction: ASC
    columnSize:
      file.name: 169
      note.started: 191
      note.ended: 195
\`\`\`
`;

      await this.app.vault.create(filepath, content);
      new Notice(`Created task: ${this.title}`);

      // Refresh task cache
      await this.plugin.taskRepository.refreshCache();

      this.close();
    } catch (error) {
      console.error('Failed to create task:', error);
      new Notice('Failed to create task');
    }
  }

  onClose(): void {
    if (this.formContainer) {
      this.formContainer.remove();
    }
  }
}
