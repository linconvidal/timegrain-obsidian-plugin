import { App, Modal, TFile } from 'obsidian';
import type TimegrainPlugin from '../main';
import type { SessionFrontmatter } from '../types';
import { parseDateTime } from '../utils/datetime';
import { formatDurationHuman, extractTaskName } from '../utils/formatters';

export type RecoveryAction = 'resume' | 'abandon' | 'ignore';

/**
 * Modal shown on startup when an unfinished session is detected
 */
export class UnfinishedSessionModal extends Modal {
  private result: RecoveryAction = 'ignore';

  constructor(
    app: App,
    private plugin: TimegrainPlugin,
    private sessionFile: TFile,
    private sessionFrontmatter: SessionFrontmatter,
    private onDecision: (action: RecoveryAction) => void
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('timegrain-unfinished-modal');

    const taskName = extractTaskName(this.sessionFrontmatter.task || 'Unknown');
    const startTime = parseDateTime(this.sessionFrontmatter.started);
    const elapsed = Date.now() - startTime.getTime();

    // Title
    contentEl.createEl('h2', { text: 'Unfinished session detected' });

    // Session info
    const infoContainer = contentEl.createDiv('timegrain-unfinished-info');
    infoContainer.createEl('p', {
      text: `You have an unfinished session for:`,
    });
    infoContainer.createEl('p', {
      text: taskName,
      cls: 'timegrain-unfinished-task',
    });
    infoContainer.createEl('p', {
      text: `Started ${formatDurationHuman(elapsed)} ago`,
      cls: 'timegrain-unfinished-time',
    });

    // Action buttons
    const actionsContainer = contentEl.createDiv('timegrain-unfinished-actions');

    // Resume button
    const resumeBtn = actionsContainer.createEl('button', {
      text: 'Resume session',
      cls: 'mod-cta',
    });
    resumeBtn.addEventListener('click', () => {
      this.result = 'resume';
      this.close();
    });

    // Abandon button
    const abandonBtn = actionsContainer.createEl('button', {
      text: 'Abandon session',
      cls: 'mod-warning',
    });
    abandonBtn.addEventListener('click', () => {
      this.result = 'abandon';
      this.close();
    });

    // Ignore button
    const ignoreBtn = actionsContainer.createEl('button', {
      text: 'Decide later',
    });
    ignoreBtn.addEventListener('click', () => {
      this.result = 'ignore';
      this.close();
    });
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
    this.onDecision(this.result);
  }
}
