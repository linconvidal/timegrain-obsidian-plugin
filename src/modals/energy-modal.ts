import { App, Modal, TFile } from 'obsidian';
import type TimegrainPlugin from '../main';
import type { Feeling } from '../types';

interface FeelingOption {
  value: Feeling;
  emoji: string;
  label: string;
}

const FEELING_OPTIONS: FeelingOption[] = [
  { value: 'very_weak', emoji: '😞', label: 'Very Weak' },
  { value: 'weak', emoji: '😟', label: 'Weak' },
  { value: 'normal', emoji: '😐', label: 'Normal' },
  { value: 'strong', emoji: '😊', label: 'Strong' },
  { value: 'very_strong', emoji: '😄', label: 'Very Strong' },
];

const EFFORT_LABELS: Record<number, string> = {
  0: 'None',
  1: 'Very Light',
  2: 'Light',
  3: 'Light',
  4: 'Moderate',
  5: 'Moderate',
  6: 'Hard',
  7: 'Hard',
  8: 'Very Hard',
  9: 'Very Hard',
  10: 'Maximum',
};

/**
 * Modal for recording feeling and perceived effort after completing a session
 */
export class EnergyModal extends Modal {
  private selectedFeeling: Feeling = 'normal';
  private perceivedEffort = 5;
  private feelingButtons: HTMLButtonElement[] = [];
  private effortSlider: HTMLInputElement | null = null;
  private effortLabel: HTMLSpanElement | null = null;

  constructor(
    app: App,
    private plugin: TimegrainPlugin,
    private sessionFile: TFile
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('timegrain-energy-modal');

    // Title
    contentEl.createEl('h2', { text: 'How was your session?' });

    // Feeling section
    contentEl.createEl('h3', { text: 'How do you feel?', cls: 'timegrain-section-title' });

    const feelingContainer = contentEl.createDiv('timegrain-feeling-selector');

    FEELING_OPTIONS.forEach((option) => {
      const btn = feelingContainer.createEl('button', {
        cls: `timegrain-feeling-btn ${option.value === this.selectedFeeling ? 'selected' : ''}`,
      });
      btn.setAttribute('data-feeling', option.value);

      btn.createEl('span', { text: option.emoji, cls: 'timegrain-feeling-emoji' });
      btn.createEl('span', { text: option.label, cls: 'timegrain-feeling-label' });

      btn.addEventListener('click', () => {
        this.selectedFeeling = option.value;
        this.updateFeelingSelection();
      });

      this.feelingButtons.push(btn);
    });

    // Perceived effort section
    contentEl.createEl('h3', { text: 'Perceived Effort', cls: 'timegrain-section-title' });

    const effortContainer = contentEl.createDiv('timegrain-effort-container');

    const effortHeader = effortContainer.createDiv('timegrain-effort-header');
    this.effortLabel = effortHeader.createEl('span', {
      text: this.getEffortText(),
      cls: 'timegrain-effort-value',
    });

    const sliderContainer = effortContainer.createDiv('timegrain-slider-container');

    // Slider labels
    const sliderLabels = sliderContainer.createDiv('timegrain-slider-labels');
    sliderLabels.createEl('span', { text: '0', cls: 'timegrain-slider-min' });
    sliderLabels.createEl('span', { text: '10', cls: 'timegrain-slider-max' });

    // Slider
    this.effortSlider = sliderContainer.createEl('input', {
      type: 'range',
      cls: 'timegrain-effort-slider',
    });
    this.effortSlider.min = '0';
    this.effortSlider.max = '10';
    this.effortSlider.value = String(this.perceivedEffort);
    this.effortSlider.addEventListener('input', () => {
      this.perceivedEffort = parseInt(this.effortSlider!.value, 10);
      this.updateEffortLabel();
    });

    // Submit button
    const submitContainer = contentEl.createDiv('timegrain-energy-submit');
    const submitBtn = submitContainer.createEl('button', {
      text: 'Save',
      cls: 'mod-cta',
    });
    submitBtn.addEventListener('click', () => this.submit());

    // Skip button
    const skipBtn = submitContainer.createEl('button', {
      text: 'Skip',
      cls: 'timegrain-skip-btn',
    });
    skipBtn.addEventListener('click', () => this.close());
  }

  private getEffortText(): string {
    return `${this.perceivedEffort} - ${EFFORT_LABELS[this.perceivedEffort]}`;
  }

  private updateFeelingSelection(): void {
    this.feelingButtons.forEach((btn) => {
      const feeling = btn.getAttribute('data-feeling');
      btn.classList.toggle('selected', feeling === this.selectedFeeling);
    });
  }

  private updateEffortLabel(): void {
    if (this.effortLabel) {
      this.effortLabel.textContent = this.getEffortText();
    }
  }

  private async submit(): Promise<void> {
    await this.plugin.sessionRepository.recordPostSession(
      this.sessionFile,
      this.selectedFeeling,
      this.perceivedEffort
    );
    // Small delay to let metadata cache update, then trigger refresh
    setTimeout(() => {
      this.plugin.timerService.trigger('session-updated');
    }, 100);
    this.close();
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}
