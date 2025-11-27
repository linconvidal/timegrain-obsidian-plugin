import { useState, useCallback } from 'react';
import type { TimegrainSettings } from '../types';
import { usePlugin } from '../context/PluginContext';

/**
 * Hook for accessing plugin settings
 * Note: Settings are directly read from plugin on each render to ensure freshness.
 * The local state is only used for updateSetting to trigger re-renders.
 */
export function useSettings() {
  const { plugin } = usePlugin();
  const [, forceUpdate] = useState({});

  const updateSetting = useCallback(
    async <K extends keyof TimegrainSettings>(key: K, value: TimegrainSettings[K]) => {
      plugin.settings[key] = value;
      await plugin.saveSettings();
      forceUpdate({});
    },
    [plugin]
  );

  return {
    settings: plugin.settings,
    updateSetting,
  };
}
