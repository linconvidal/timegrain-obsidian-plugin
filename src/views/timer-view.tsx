import { ItemView, WorkspaceLeaf } from 'obsidian';
import { createRoot, Root } from 'react-dom/client';
import { StrictMode } from 'react';
import type TimegrainPlugin from '../main';
import { VIEW_TYPE_TIMER } from '../constants';
import { PluginProvider } from '../context/PluginContext';
import { TimerDisplay } from '../components/TimerDisplay';

/**
 * Obsidian ItemView wrapper for the React Timer component
 */
export class TimerView extends ItemView {
  private root: Root | null = null;

  constructor(
    leaf: WorkspaceLeaf,
    private plugin: TimegrainPlugin
  ) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_TIMER;
  }

  getDisplayText(): string {
    return 'Timegrain Timer';
  }

  getIcon(): string {
    return 'clock';
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('timegrain-timer-view');

    this.root = createRoot(container);
    this.root.render(
      <StrictMode>
        <PluginProvider plugin={this.plugin}>
          <TimerDisplay />
        </PluginProvider>
      </StrictMode>
    );
  }

  async onClose(): Promise<void> {
    this.root?.unmount();
    this.root = null;
  }
}
