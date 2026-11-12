import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_APPEARANCE,
  THEMES,
  applyAppearance,
  loadAppearance,
  resolveTheme,
  saveAppearance,
  type Appearance,
  type ColorMode,
  type ThemeMode,
  type ThemePreset,
} from '@/lib/themes';

interface ThemeContextType {
  /** `dark` or `light`: the mode in use right now (`system` already resolved). */
  theme: ThemeMode;
  /** Id of the palette in use right now, see `THEMES`. */
  themeId: string;
  themes: readonly ThemePreset[];
  /** Everything the user picked. */
  appearance: Appearance;
  setMode: (mode: ColorMode) => void;
  updateAppearance: (patch: Partial<Appearance>) => void;
  resetAppearance: () => void;
  /**
   * Changes whenever anything that affects colours changes. Components that
   * read computed styles (the chart) use it to know when to read them again.
   */
  colorKey: string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const DARK_QUERY = '(prefers-color-scheme: dark)';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [appearance, setAppearance] = useState(loadAppearance);
  const [prefersDark, setPrefersDark] = useState(() => window.matchMedia?.(DARK_QUERY).matches ?? true);
  const current = useRef(appearance);

  // The document is updated before React re-renders, so components that read
  // computed styles during render (the chart) already see the new palette.
  const commit = useCallback((next: Appearance) => {
    current.current = next;
    applyAppearance(next);
    saveAppearance(next);
    setAppearance(next);
  }, []);

  const updateAppearance = useCallback(
    (patch: Partial<Appearance>) => commit({ ...current.current, ...patch }),
    [commit],
  );

  // Auto mode follows the OS switch between light and dark while the page is open.
  useEffect(() => {
    const media = window.matchMedia?.(DARK_QUERY);
    if (!media) return;
    const onChange = () => {
      applyAppearance(current.current);
      setPrefersDark(media.matches);
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const value = useMemo<ThemeContextType>(() => {
    const theme = resolveTheme(appearance, prefersDark);
    return {
      theme: theme.mode,
      themeId: theme.id,
      themes: THEMES,
      appearance,
      setMode: (mode) => updateAppearance({ mode }),
      updateAppearance,
      resetAppearance: () => commit({ ...DEFAULT_APPEARANCE }),
      colorKey: [theme.id, appearance.accent, appearance.customAccent, appearance.priceColors].join('|'),
    };
  }, [appearance, prefersDark, updateAppearance, commit]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
