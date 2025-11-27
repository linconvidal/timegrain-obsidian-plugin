import { App, PluginSettingTab, Setting } from 'obsidian';
import type TimegrainPlugin from './main';
import type { TimegrainSettings, TaskStatus } from './types';
import {
  POMODORO_DURATION_SECONDS,
  DEFAULT_TIMER_SESSIONS_DIR,
  DEFAULT_TASK_DIRECTORY,
  DEFAULT_DAILY_GOAL_POMS,
  DEFAULT_ENERGY_HIGH_THRESHOLD,
  DEFAULT_ENERGY_LOW_THRESHOLD,
} from './constants';

// ============================================================================
// Default Settings
// ============================================================================

export const DEFAULT_SETTINGS: TimegrainSettings = {
  // Paths
  timerSessionsDir: DEFAULT_TIMER_SESSIONS_DIR,
  defaultTaskDirectory: DEFAULT_TASK_DIRECTORY,

  // Timer
  cycleSeconds: POMODORO_DURATION_SECONDS,
  playSound: true,

  // Goals
  dailyGoalPoms: DEFAULT_DAILY_GOAL_POMS,

  // Energy
  energyHighThreshold: DEFAULT_ENERGY_HIGH_THRESHOLD,
  energyLowThreshold: DEFAULT_ENERGY_LOW_THRESHOLD,

  // UI
  showStatusBar: true,
  statusBarClickAction: 'open-timer',

  // Behavior
  rolloverStaleTasks: true,
  taskStatuses: ['today', 'in progress'],
  completedStatuses: ['done', 'archived'],
  areaBlacklist: [],
};

// ============================================================================
// Settings Tab
// ============================================================================

export class TimegrainSettingTab extends PluginSettingTab {
  plugin: TimegrainPlugin;

  constructor(app: App, plugin: TimegrainPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // ========================================================================
    // Timer Settings
    // ========================================================================
    containerEl.createEl('h2', { text: 'Timer settings' });

    new Setting(containerEl)
      .setName('Pomodoro duration')
      .setDesc('Duration of a single pomodoro in minutes')
      .addSlider((slider) =>
        slider
          .setLimits(5, 60, 5)
          .setValue(this.plugin.settings.cycleSeconds / 60)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.cycleSeconds = value * 60;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Play sound')
      .setDesc('Play a sound when the timer completes')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.playSound)
          .onChange(async (value) => {
            this.plugin.settings.playSound = value;
            await this.plugin.saveSettings();
          })
      );

    // ========================================================================
    // Paths
    // ========================================================================
    containerEl.createEl('h2', { text: 'File paths' });

    new Setting(containerEl)
      .setName('Timer sessions directory')
      .setDesc('Directory where timer session files are stored')
      .addText((text) =>
        text
          .setPlaceholder('timer_sessions')
          .setValue(this.plugin.settings.timerSessionsDir)
          .onChange(async (value) => {
            this.plugin.settings.timerSessionsDir = value || DEFAULT_TIMER_SESSIONS_DIR;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Default task directory')
      .setDesc('Default directory for new tasks')
      .addText((text) =>
        text
          .setPlaceholder('tasks')
          .setValue(this.plugin.settings.defaultTaskDirectory)
          .onChange(async (value) => {
            this.plugin.settings.defaultTaskDirectory = value || DEFAULT_TASK_DIRECTORY;
            await this.plugin.saveSettings();
          })
      );

    // ========================================================================
    // Goals
    // ========================================================================
    containerEl.createEl('h2', { text: 'Goals' });

    new Setting(containerEl)
      .setName('Daily pomodoro goal')
      .setDesc('Target number of pomodoros per day')
      .addSlider((slider) =>
        slider
          .setLimits(1, 20, 1)
          .setValue(this.plugin.settings.dailyGoalPoms)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.dailyGoalPoms = value;
            await this.plugin.saveSettings();
          })
      );

    // ========================================================================
    // Energy Tracking
    // ========================================================================
    containerEl.createEl('h2', { text: 'Energy tracking' });

    new Setting(containerEl)
      .setName('High energy threshold')
      .setDesc('Energy level considered "high" (for insights)')
      .addSlider((slider) =>
        slider
          .setLimits(1, 5, 1)
          .setValue(this.plugin.settings.energyHighThreshold)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.energyHighThreshold = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Low energy threshold')
      .setDesc('Energy level considered "low" (for insights)')
      .addSlider((slider) =>
        slider
          .setLimits(1, 5, 1)
          .setValue(this.plugin.settings.energyLowThreshold)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.energyLowThreshold = value;
            await this.plugin.saveSettings();
          })
      );

    // ========================================================================
    // UI Settings
    // ========================================================================
    containerEl.createEl('h2', { text: 'Interface' });

    new Setting(containerEl)
      .setName('Show status bar timer')
      .setDesc('Display a minimal timer in the status bar')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showStatusBar)
          .onChange(async (value) => {
            this.plugin.settings.showStatusBar = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Status bar click action')
      .setDesc('What happens when you click the status bar timer')
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({
            'open-timer': 'Open timer view',
            'toggle-pause': 'Pause/resume timer',
            'open-task': 'Open current task',
          })
          .setValue(this.plugin.settings.statusBarClickAction)
          .onChange(async (value) => {
            this.plugin.settings.statusBarClickAction = value as TimegrainSettings['statusBarClickAction'];
            await this.plugin.saveSettings();
          })
      );

    // ========================================================================
    // Behavior
    // ========================================================================
    containerEl.createEl('h2', { text: 'Behavior' });

    new Setting(containerEl)
      .setName('Rollover stale tasks')
      .setDesc('Automatically move old "today" tasks to "this week"')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.rolloverStaleTasks)
          .onChange(async (value) => {
            this.plugin.settings.rolloverStaleTasks = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Task statuses to show')
      .setDesc('Comma-separated list of task statuses to display (e.g., "today, in progress")')
      .addText((text) =>
        text
          .setPlaceholder('today, in progress')
          .setValue(this.plugin.settings.taskStatuses.join(', '))
          .onChange(async (value) => {
            this.plugin.settings.taskStatuses = value
              .split(',')
              .map((s) => s.trim().toLowerCase() as TaskStatus)
              .filter((s) => s.length > 0);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Completed statuses')
      .setDesc('Task statuses to hide from search by default (e.g., "done, archived")')
      .addText((text) =>
        text
          .setPlaceholder('done, archived')
          .setValue(this.plugin.settings.completedStatuses.join(', '))
          .onChange(async (value) => {
            this.plugin.settings.completedStatuses = value
              .split(',')
              .map((s) => s.trim().toLowerCase() as TaskStatus)
              .filter((s) => s.length > 0);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Area blacklist')
      .setDesc('Comma-separated list of areas to exclude from focus stats')
      .addText((text) =>
        text
          .setPlaceholder('archive, templates')
          .setValue(this.plugin.settings.areaBlacklist.join(', '))
          .onChange(async (value) => {
            this.plugin.settings.areaBlacklist = value
              .split(',')
              .map((s) => s.trim().toLowerCase())
              .filter((s) => s.length > 0);
            await this.plugin.saveSettings();
          })
      );
  }
}
