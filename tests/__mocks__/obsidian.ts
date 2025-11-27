/**
 * Mock implementations for Obsidian API used in tests
 */

export class Events {
  private callbacks: Map<string, ((...args: unknown[]) => void)[]> = new Map();

  on(event: string, callback: (...args: unknown[]) => void): void {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event)!.push(callback);
  }

  off(event: string, callback: (...args: unknown[]) => void): void {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  trigger(event: string, ...args: unknown[]): void {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(...args));
    }
  }
}

export class TFile {
  path: string;
  basename: string;
  extension: string;
  name: string;
  parent: TFolder | null;
  stat: { mtime: number; ctime: number; size: number };

  constructor(path: string) {
    this.path = path;
    this.basename = path.split('/').pop()?.replace(/\.[^.]+$/, '') || '';
    this.extension = path.split('.').pop() || '';
    this.name = path.split('/').pop() || '';
    this.parent = null;
    this.stat = { mtime: Date.now(), ctime: Date.now(), size: 0 };
  }
}

export class TFolder {
  path: string;
  name: string;
  parent: TFolder | null;
  children: (TFile | TFolder)[];

  constructor(path: string) {
    this.path = path;
    this.name = path.split('/').pop() || '';
    this.parent = null;
    this.children = [];
  }
}

export class TAbstractFile {
  path: string;
  name: string;

  constructor(path: string) {
    this.path = path;
    this.name = path.split('/').pop() || '';
  }
}

export class Notice {
  message: string;

  constructor(message: string) {
    this.message = message;
  }
}

export class Modal {
  app: App;
  contentEl: HTMLElement;

  constructor(app: App) {
    this.app = app;
    this.contentEl = document.createElement('div');
  }

  open(): void {}
  close(): void {}
  onOpen(): void {}
  onClose(): void {}
}

export class App {
  vault: Vault;
  workspace: Workspace;
  metadataCache: MetadataCache;

  constructor() {
    this.vault = new Vault();
    this.workspace = new Workspace();
    this.metadataCache = new MetadataCache();
  }
}

export class Vault {
  private files: Map<string, string> = new Map();

  async read(file: TFile): Promise<string> {
    return this.files.get(file.path) || '';
  }

  async modify(file: TFile, content: string): Promise<void> {
    this.files.set(file.path, content);
  }

  async create(path: string, content: string): Promise<TFile> {
    this.files.set(path, content);
    return new TFile(path);
  }

  async delete(file: TFile): Promise<void> {
    this.files.delete(file.path);
  }

  getAbstractFileByPath(path: string): TFile | TFolder | null {
    if (this.files.has(path)) {
      return new TFile(path);
    }
    return null;
  }

  getMarkdownFiles(): TFile[] {
    return Array.from(this.files.keys())
      .filter((p) => p.endsWith('.md'))
      .map((p) => new TFile(p));
  }

  async createFolder(path: string): Promise<void> {
    // No-op for tests
  }

  // Test helpers
  _setFile(path: string, content: string): void {
    this.files.set(path, content);
  }

  _getFile(path: string): string | undefined {
    return this.files.get(path);
  }
}

export class Workspace {
  private leaves: WorkspaceLeaf[] = [];
  private layoutReadyCallbacks: (() => void)[] = [];

  getActiveFile(): TFile | null {
    return null;
  }

  getLeaf(): WorkspaceLeaf {
    return new WorkspaceLeaf();
  }

  getRightLeaf(split: boolean): WorkspaceLeaf | null {
    return new WorkspaceLeaf();
  }

  getLeavesOfType(type: string): WorkspaceLeaf[] {
    return this.leaves.filter((l) => l.getViewState().type === type);
  }

  detachLeavesOfType(type: string): void {
    this.leaves = this.leaves.filter((l) => l.getViewState().type !== type);
  }

  revealLeaf(leaf: WorkspaceLeaf): void {}

  onLayoutReady(callback: () => void): void {
    this.layoutReadyCallbacks.push(callback);
  }

  // Test helper
  _triggerLayoutReady(): void {
    this.layoutReadyCallbacks.forEach((cb) => cb());
  }
}

export class WorkspaceLeaf {
  private viewState: { type: string; active: boolean } = { type: '', active: false };

  async setViewState(state: { type: string; active: boolean }): Promise<void> {
    this.viewState = state;
  }

  getViewState(): { type: string; active: boolean } {
    return this.viewState;
  }

  openFile(file: TFile): void {}
}

export class MetadataCache {
  private cache: Map<string, { frontmatter?: Record<string, unknown> }> = new Map();

  getFileCache(file: TFile): { frontmatter?: Record<string, unknown> } | null {
    return this.cache.get(file.path) || null;
  }

  on(event: string, callback: (...args: unknown[]) => void): void {}
  off(event: string, callback: (...args: unknown[]) => void): void {}

  // Test helper
  _setCache(path: string, data: { frontmatter?: Record<string, unknown> }): void {
    this.cache.set(path, data);
  }
}

export class Plugin {
  app: App;
  manifest: PluginManifest;

  constructor(app: App, manifest: PluginManifest) {
    this.app = app;
    this.manifest = manifest;
  }

  async loadData(): Promise<unknown> {
    return {};
  }

  async saveData(data: unknown): Promise<void> {}

  registerView(type: string, factory: (leaf: WorkspaceLeaf) => unknown): void {}

  addCommand(command: unknown): void {}

  addRibbonIcon(icon: string, title: string, callback: () => void): void {}

  addStatusBarItem(): HTMLElement {
    return document.createElement('div');
  }

  addSettingTab(tab: unknown): void {}

  registerInterval(interval: number): void {}

  registerDomEvent(
    el: HTMLElement,
    event: string,
    callback: (evt: Event) => void
  ): void {}
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
}

export class PluginSettingTab {
  app: App;
  plugin: Plugin;
  containerEl: HTMLElement;

  constructor(app: App, plugin: Plugin) {
    this.app = app;
    this.plugin = plugin;
    this.containerEl = document.createElement('div');
  }

  display(): void {}
  hide(): void {}
}

export class Setting {
  constructor(containerEl: HTMLElement) {}

  setName(name: string): this {
    return this;
  }

  setDesc(desc: string): this {
    return this;
  }

  addText(callback: (text: unknown) => void): this {
    return this;
  }

  addToggle(callback: (toggle: unknown) => void): this {
    return this;
  }

  addSlider(callback: (slider: unknown) => void): this {
    return this;
  }

  addDropdown(callback: (dropdown: unknown) => void): this {
    return this;
  }
}

export class ItemView {
  app: App;
  contentEl: HTMLElement;
  leaf: WorkspaceLeaf;

  constructor(leaf: WorkspaceLeaf) {
    this.leaf = leaf;
    this.app = new App();
    this.contentEl = document.createElement('div');
  }

  getViewType(): string {
    return '';
  }

  getDisplayText(): string {
    return '';
  }

  getIcon(): string {
    return '';
  }

  async onOpen(): Promise<void> {}
  async onClose(): Promise<void> {}
}

export class FuzzySuggestModal<T> {
  app: App;

  constructor(app: App) {
    this.app = app;
  }

  setPlaceholder(placeholder: string): void {}
  getItems(): T[] {
    return [];
  }
  getItemText(item: T): string {
    return '';
  }
  onChooseItem(item: T, evt: MouseEvent | KeyboardEvent): void {}
  open(): void {}
  close(): void {}
}

// Utility function for processing frontmatter
export function parseFrontMatterEntry(
  frontmatter: Record<string, unknown> | undefined,
  key: string
): unknown {
  return frontmatter?.[key];
}

export function processFrontMatter(
  file: TFile,
  callback: (frontmatter: Record<string, unknown>) => void
): void {
  // No-op for tests
}
