import * as React from 'react';
const { createContext, useContext } = React;
import type { App } from 'obsidian';
import type TimegrainPlugin from '../main';

/**
 * Context value type for plugin access in React components
 */
export interface PluginContextValue {
  plugin: TimegrainPlugin;
  app: App;
}

/**
 * React context for accessing the plugin and Obsidian app
 */
export const PluginContext = createContext<PluginContextValue | null>(null);

/**
 * Provider component for the plugin context
 */
export function PluginProvider({
  plugin,
  children,
}: {
  plugin: TimegrainPlugin;
  children: React.ReactNode;
}): JSX.Element {
  const value: PluginContextValue = {
    plugin,
    app: plugin.app,
  };
  return React.createElement(PluginContext.Provider, { value }, children);
}

/**
 * Hook to access the plugin context
 * Throws if used outside of PluginContext.Provider
 */
export function usePlugin(): PluginContextValue {
  const context = useContext(PluginContext);
  if (!context) {
    throw new Error('usePlugin must be used within a PluginContext.Provider');
  }
  return context;
}

/**
 * Hook to access just the Obsidian app
 */
export function useApp(): App {
  const { app } = usePlugin();
  return app;
}
