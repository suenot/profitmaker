import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

interface ThemeColors {
  bg: string;
  widget: string;
  accent: string;
  text: string;
  muted: string;
  positive: string;
  negative: string;
  border: string;
}

interface ThemeContextType {
  theme: Theme;
  themeVariant: string;
  toggleTheme: () => void;
  setThemeVariant: (variant: string, colors: ThemeColors) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Terminal surface tokens (HSL for Tailwind). Keep this in sync with index.css:
// colors are applied inline when a user switches theme at runtime.
const modernDarkColors: ThemeColors = {
  bg: '240 9% 7%',
  widget: '240 8% 11%',
  accent: '240 7% 15%',
  text: '240 14% 94%',
  muted: '240 7% 65%',
  positive: '151 58% 54%',
  negative: '0 70% 65%',
  border: '240 7% 19%'
};

const modernLightColors: ThemeColors = {
  bg: '240 20% 98%',
  widget: '0 0% 100%',
  accent: '240 18% 96%',
  text: '240 18% 13%',
  muted: '240 8% 42%',
  positive: '151 58% 38%',
  negative: '0 65% 50%',
  border: '240 14% 88%'
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme') as Theme;
    console.log('🎨 Theme Provider: Loading saved theme:', saved);
    return saved || 'dark';
  });

  const [themeVariant, setThemeVariantState] = useState<string>(() => {
    const saved = localStorage.getItem('themeVariant');
    console.log('🎨 Theme Provider: Loading saved variant:', saved);
    return saved || (theme === 'dark' ? 'dark' : 'light');
  });

  const applyThemeColors = (colors: ThemeColors) => {
    console.log('🎨 Applying theme colors:', colors);
    const root = document.documentElement;
    
    // Apply colors directly
    Object.entries(colors).forEach(([key, value]) => {
      const cssVar = `--terminal-${key}`;
      console.log(`🎨 Setting ${cssVar}: ${value}`);
      root.style.setProperty(cssVar, value);
    });
    
    // Force update styles
    root.style.setProperty('--terminal-bg', colors.bg);
    root.style.setProperty('--terminal-widget', colors.widget);
    root.style.setProperty('--terminal-accent', colors.accent);
    root.style.setProperty('--terminal-text', colors.text);
    root.style.setProperty('--terminal-muted', colors.muted);
    root.style.setProperty('--terminal-positive', colors.positive);
    root.style.setProperty('--terminal-negative', colors.negative);
    root.style.setProperty('--terminal-border', colors.border);
    
    // Verify application
    setTimeout(() => {
      const computedStyle = getComputedStyle(root);
      console.log('🎨 Verification - Applied CSS variables:');
      Object.keys(colors).forEach(key => {
        const cssVar = `--terminal-${key}`;
        const appliedValue = computedStyle.getPropertyValue(cssVar).trim();
        console.log(`🎨 ${cssVar}: ${appliedValue}`);
      });
    }, 100);
  };

  useEffect(() => {
    console.log('🎨 Theme effect triggered - theme:', theme);
    
    // Apply theme class
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    
    // Save to localStorage
    localStorage.setItem('theme', theme);
    
    // Apply modern colors immediately
    const modernColors = theme === 'dark' ? modernDarkColors : modernLightColors;
    applyThemeColors(modernColors);
    
    // Update theme variant
    const newVariant = theme === 'dark' ? 'dark' : 'light';
    setThemeVariantState(newVariant);
    localStorage.setItem('themeVariant', newVariant);
    
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    console.log('🎨 Toggling theme from', theme, 'to', newTheme);
    setTheme(newTheme);
  };

  const setThemeVariant = (variant: string, colors: ThemeColors) => {
    console.log('🎨 Setting theme variant:', variant, 'with colors:', colors);
    setThemeVariantState(variant);
    applyThemeColors(colors);
    localStorage.setItem('themeVariant', variant);
    localStorage.setItem(`themeColors_${variant}`, JSON.stringify(colors));
    console.log('🎨 Saved variant and colors to localStorage');
  };

  return (
    <ThemeContext.Provider value={{ theme, themeVariant, toggleTheme, setThemeVariant }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
