import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { THEMES, applyTheme, getStoredThemeId, getTheme, type ThemeMode, type ThemePreset } from '@/lib/themes';

interface ThemeContextType {
  /** `dark` or `light`: the mode of the active theme. */
  theme: ThemeMode;
  /** Id of the active theme, see `THEMES`. */
  themeId: string;
  themes: readonly ThemePreset[];
  setTheme: (id: string) => void;
  /** Switches between the default dark and the default light theme. */
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeId, setThemeId] = useState(getStoredThemeId);

  // The document is updated before React re-renders, so components that read
  // computed styles during render (the chart) already see the new palette.
  const setTheme = useCallback((id: string) => {
    setThemeId(applyTheme(id).id);
  }, []);

  const value = useMemo<ThemeContextType>(() => {
    const mode = getTheme(themeId).mode;
    return {
      theme: mode,
      themeId,
      themes: THEMES,
      setTheme,
      toggleTheme: () => setTheme(mode === 'dark' ? 'light' : 'dark'),
    };
  }, [themeId, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
