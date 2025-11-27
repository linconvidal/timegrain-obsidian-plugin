import { ItemView, WorkspaceLeaf } from 'obsidian';
import { Root, createRoot } from 'react-dom/client';
import type TimegrainPlugin from '../main';
import { PluginProvider } from '../context/PluginContext';
import { CalendarView } from '../components/CalendarView';
import { VIEW_TYPE_DASHBOARD } from '../constants';

export class DashboardView extends ItemView {
  private root: Root | null = null;

  constructor(
    leaf: WorkspaceLeaf,
    private plugin: TimegrainPlugin
  ) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_DASHBOARD;
  }

  getDisplayText(): string {
    return 'Timegrain Dashboard';
  }

  getIcon(): string {
    return 'calendar-days';
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('timegrain-dashboard-view');

    this.root = createRoot(container);
    this.root.render(
      <PluginProvider plugin={this.plugin}>
        <CalendarView />
      </PluginProvider>
    );
  }

  async onClose(): Promise<void> {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
  }
}
