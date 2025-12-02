import { Plugin, TFile, Notice, WorkspaceLeaf } from 'obsidian';
import type { TimegrainSettings } from './types';
import { DEFAULT_SETTINGS, TimegrainSettingTab } from './settings';
import { VIEW_TYPE_TIMER, VIEW_TYPE_DASHBOARD, TIMER_TICK_INTERVAL, STATE_PERSISTENCE_INTERVAL } from './constants';
import { TaskRepository } from './data/task-repository';
import { SessionRepository } from './data/session-repository';
import { TimerService } from './services/timer-service';
import { TimerView } from './views/timer-view';
import { DashboardView } from './views/dashboard-view';
import { EnergyModal } from './modals/energy-modal';
import { TaskSuggestModal } from './modals/task-suggest-modal';
import { UnfinishedSessionModal, type RecoveryAction } from './modals/unfinished-session-modal';
import { NewTaskModal } from './modals/new-task-modal';
import { PlanDayModal } from './modals/plan-day-modal';
import { parseDateTime } from './utils/datetime';
import { extractTaskName } from './utils/formatters';

export default class TimegrainPlugin extends Plugin {
  settings!: TimegrainSettings;
  taskRepository!: TaskRepository;
  sessionRepository!: SessionRepository;
  timerService!: TimerService;

  private timerInterval: number | null = null;
  private persistenceInterval: number | null = null;
  private statusBarItem: HTMLElement | null = null;

  async onload(): Promise<void> {
    console.log('Loading Timegrain plugin');

    // Load settings
    await this.loadSettings();

    // Initialize repositories and services
    this.sessionRepository = new SessionRepository(this.app, this.settings);
    this.taskRepository = new TaskRepository(this.app, this.settings);
    this.timerService = new TimerService(
      this.sessionRepository,
      this.settings.cycleSeconds * 1000
    );

    // Register views
    this.registerView(VIEW_TYPE_TIMER, (leaf) => new TimerView(leaf, this));
    this.registerView(VIEW_TYPE_DASHBOARD, (leaf) => new DashboardView(leaf, this));

    // Register commands
    this.registerCommands();

    // Add ribbon icon
    this.addRibbonIcon('clock', 'Open Timegrain Timer', () => {
      this.activateTimerView();
    });

    // Add status bar item
    if (this.settings.showStatusBar) {
      this.setupStatusBar();
    }

    // Add settings tab
    this.addSettingTab(new TimegrainSettingTab(this.app, this));

    // Start timer tick interval
    this.timerInterval = window.setInterval(() => {
      this.timerService.tick();
      this.updateStatusBar();
    }, TIMER_TICK_INTERVAL);
    this.registerInterval(this.timerInterval);

    // Start state persistence interval
    this.persistenceInterval = window.setInterval(() => {
      this.saveTimerState();
    }, STATE_PERSISTENCE_INTERVAL);
    this.registerInterval(this.persistenceInterval);

    // Listen for timer events
    this.timerService.on('pomodoro-complete', (data: unknown) => {
      const { count } = data as { count: number };
      this.onPomodoroComplete(count);
    });

    // Initialize repositories and check for unfinished sessions once layout is ready
    // (metadata cache must be populated before reading frontmatter)
    this.app.workspace.onLayoutReady(async () => {
      // Initialize task cache now that metadata cache is ready
      await this.taskRepository.initialize();

      await this.checkForUnfinishedSessions();

      // Rollover stale tasks if enabled
      if (this.settings.rolloverStaleTasks) {
        const count = await this.taskRepository.rolloverStaleTasks();
        if (count > 0) {
          new Notice(`Rolled over ${count} stale task(s) to "this week"`);
        }
      }
    });
  }

  async onunload(): Promise<void> {
    console.log('Unloading Timegrain plugin');

    // Save timer state before unloading
    await this.saveTimerState();

    // Clean up task repository (file watchers, timers)
    this.taskRepository.destroy();

    // Detach views
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_TIMER);
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_DASHBOARD);
  }

  // ============================================================================
  // Settings
  // ============================================================================

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  // ============================================================================
  // Commands
  // ============================================================================

  private registerCommands(): void {
    // Start timer with current note
    this.addCommand({
      id: 'start-timer',
      name: 'Start timer with current note',
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file) return false;
        if (!checking) {
          this.timerService.start(file.basename, file.path).catch((e) => {
            console.error('Failed to start timer:', e);
            new Notice('Failed to start timer');
          });
        }
        return true;
      },
    });

    // Start timer with task search
    this.addCommand({
      id: 'start-timer-select',
      name: 'Start timer: Select task...',
      callback: () => this.openTaskSuggester(),
    });

    // Pause/resume timer
    this.addCommand({
      id: 'pause-resume-timer',
      name: 'Pause/resume timer',
      checkCallback: (checking) => {
        if (this.timerService.isIdle()) return false;
        if (!checking) {
          this.timerService.togglePause();
        }
        return true;
      },
    });

    // Complete timer
    this.addCommand({
      id: 'complete-timer',
      name: 'Complete timer session',
      checkCallback: (checking) => {
        if (this.timerService.isIdle()) return false;
        if (!checking) {
          this.completeTimerWithEnergyModal();
        }
        return true;
      },
    });

    // Cancel timer
    this.addCommand({
      id: 'cancel-timer',
      name: 'Cancel timer',
      checkCallback: (checking) => {
        if (this.timerService.isIdle()) return false;
        if (!checking) {
          this.timerService.cancel();
        }
        return true;
      },
    });

    // Open timer view
    this.addCommand({
      id: 'open-timer-view',
      name: 'Open timer panel',
      callback: () => this.activateTimerView(),
    });

    // Open dashboard view
    this.addCommand({
      id: 'open-dashboard',
      name: 'Open daily log',
      callback: () => this.activateDashboardView(),
    });

    // Create new task
    this.addCommand({
      id: 'create-task',
      name: 'Create new task',
      callback: () => this.openNewTaskModal(),
    });

    // Plan day
    this.addCommand({
      id: 'plan-day',
      name: 'Plan your day',
      callback: () => this.openPlanDayModal(),
    });
  }

  // ============================================================================
  // Views
  // ============================================================================

  async activateTimerView(): Promise<void> {
    const { workspace } = this.app;

    let leaf = workspace.getLeavesOfType(VIEW_TYPE_TIMER)[0];

    if (!leaf) {
      const rightLeaf = workspace.getRightLeaf(false);
      if (rightLeaf) {
        await rightLeaf.setViewState({
          type: VIEW_TYPE_TIMER,
          active: true,
        });
        leaf = rightLeaf;
      }
    }

    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }

  async activateDashboardView(): Promise<void> {
    const { workspace } = this.app;

    let leaf = workspace.getLeavesOfType(VIEW_TYPE_DASHBOARD)[0];

    if (!leaf) {
      // Open in main area
      leaf = workspace.getLeaf('tab');
      await leaf.setViewState({
        type: VIEW_TYPE_DASHBOARD,
        active: true,
      });
    }

    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }

  // ============================================================================
  // Modals
  // ============================================================================

  openTaskSuggester(): void {
    new TaskSuggestModal(this.app, this).open();
  }

  openNewTaskModal(): void {
    new NewTaskModal(this.app, this).open();
  }

  openPlanDayModal(): void {
    new PlanDayModal(this.app, this).open();
  }

  showEnergyModal(sessionFile: TFile): void {
    new EnergyModal(this.app, this, sessionFile).open();
  }

  private async completeTimerWithEnergyModal(): Promise<void> {
    const sessionFile = await this.timerService.complete();
    if (sessionFile) {
      this.showEnergyModal(sessionFile);
    }
  }


  // ============================================================================
  // Status Bar
  // ============================================================================

  private setupStatusBar(): void {
    this.statusBarItem = this.addStatusBarItem();
    this.statusBarItem.addClass('timegrain-status');
    this.statusBarItem.setText('--:--');

    this.registerDomEvent(this.statusBarItem, 'click', () => {
      switch (this.settings.statusBarClickAction) {
        case 'open-timer':
          this.activateTimerView();
          break;
        case 'toggle-pause':
          if (!this.timerService.isIdle()) {
            this.timerService.togglePause();
          }
          break;
        case 'open-task':
          const status = this.timerService.getStatus();
          if (status.taskPath) {
            const file = this.app.vault.getAbstractFileByPath(status.taskPath);
            if (file instanceof TFile) {
              this.app.workspace.getLeaf().openFile(file);
            }
          }
          break;
      }
    });
  }

  private updateStatusBar(): void {
    if (!this.statusBarItem) return;

    const status = this.timerService.getStatus();

    if (status.state === 'idle') {
      this.statusBarItem.setText('--:--');
      this.statusBarItem.removeClass('timegrain-active');
      this.statusBarItem.removeClass('timegrain-paused');
    } else {
      const minutes = Math.floor(status.elapsedSeconds / 60);
      const seconds = status.elapsedSeconds % 60;
      const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

      this.statusBarItem.setText(`⏱ ${timeStr}`);
      this.statusBarItem.addClass('timegrain-active');
      this.statusBarItem.toggleClass('timegrain-paused', status.state === 'paused');
    }
  }

  // ============================================================================
  // Timer State Persistence
  // ============================================================================

  private async saveTimerState(): Promise<void> {
    const state = this.timerService.getPersistedState();
    await this.saveData({
      ...this.settings,
      _timerState: state,
    });
  }

  // ============================================================================
  // Unfinished Session Recovery
  // ============================================================================

  private async checkForUnfinishedSessions(): Promise<void> {
    const unfinished = await this.sessionRepository.findLatestUnfinishedSession();
    if (!unfinished) return;

    const { file, frontmatter } = unfinished;

    new UnfinishedSessionModal(
      this.app,
      this,
      file,
      frontmatter,
      async (action: RecoveryAction) => {
        await this.handleRecoveryDecision(file, frontmatter, action);
      }
    ).open();
  }

  private async handleRecoveryDecision(
    sessionFile: TFile,
    frontmatter: import('./types').SessionFrontmatter,
    action: RecoveryAction
  ): Promise<void> {
    switch (action) {
      case 'resume':
        const startTime = parseDateTime(frontmatter.started);
        const taskName = extractTaskName(frontmatter.task || 'Unknown');
        await this.timerService.restoreFromSession(sessionFile, taskName, startTime);
        new Notice(`Resumed session for "${taskName}"`);
        break;

      case 'abandon':
        await this.timerService.abandonSession(sessionFile);
        new Notice('Session abandoned');
        break;

      case 'ignore':
        // Do nothing
        break;
    }
  }

  // ============================================================================
  // Notifications
  // ============================================================================

  private onPomodoroComplete(count: number): void {
    if (this.settings.playSound) {
      this.playNotificationSound();
    }

    new Notice(`Grain ${count} complete!`);
  }

  private playNotificationSound(): void {
    // Simple oscillator beep
    try {
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);

      // Close AudioContext after sound finishes to prevent memory leak
      // Use both onended callback and timeout fallback for reliability
      let closed = false;
      const closeContext = () => {
        if (!closed) {
          closed = true;
          audioContext.close();
        }
      };
      oscillator.onended = closeContext;
      // Fallback timeout in case onended doesn't fire (some browsers)
      setTimeout(closeContext, 1000);
    } catch (e) {
      console.error('Failed to play notification sound:', e);
    }
  }
}
