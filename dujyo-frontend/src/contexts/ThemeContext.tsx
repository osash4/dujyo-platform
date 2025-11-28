// src/contexts/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'dark' | 'light' | 'auto';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  effectiveTheme: 'dark' | 'light'; // The actual theme being used (resolves 'auto')
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Load theme from localStorage or default to 'dark'
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark';
    const stored = localStorage.getItem('dujyo_theme') as Theme;
    return stored && ['dark', 'light', 'auto'].includes(stored) ? stored : 'dark';
  });

  // Calculate effective theme (resolves 'auto' to actual preference)
  const getEffectiveTheme = (): 'dark' | 'light' => {
    if (theme === 'auto') {
      if (typeof window === 'undefined') return 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  };

  const [effectiveTheme, setEffectiveTheme] = useState<'dark' | 'light'>(getEffectiveTheme);

  // Apply theme to document
  const applyTheme = (themeMode: Theme) => {
    const root = document.documentElement;
    const effective = themeMode === 'auto' 
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : themeMode;

    // Remove all theme classes
    root.classList.remove('dark', 'light', 'theme-dark', 'theme-light');
    
    // Add appropriate theme class
    root.classList.add(effective === 'dark' ? 'theme-dark' : 'theme-light');
    root.classList.add(effective);
    
    // Set data attribute for CSS selectors
    root.setAttribute('data-theme', effective);
    
    // Update CSS variables based on theme
    if (effective === 'light') {
      root.style.setProperty('--bg-primary', '#FFFFFF');
      root.style.setProperty('--bg-secondary', '#F9FAFB');
      root.style.setProperty('--bg-card', '#FFFFFF');
      root.style.setProperty('--text-primary', '#111827');
      root.style.setProperty('--text-secondary', '#6B7280');
      root.style.setProperty('--text-muted', '#9CA3AF');
      root.style.setProperty('--border-color', '#E5E7EB');
    } else {
      // Dark theme (default)
      root.style.setProperty('--bg-primary', '#0A0A0F');
      root.style.setProperty('--bg-secondary', '#111827');
      root.style.setProperty('--bg-card', '#1A1A2E');
      root.style.setProperty('--text-primary', '#FFFFFF');
      root.style.setProperty('--text-secondary', '#B8B8CC');
      root.style.setProperty('--text-muted', '#6B7280');
      root.style.setProperty('--border-color', '#374151');
    }
    
    setEffectiveTheme(effective);
  };

  // Apply theme on mount and when theme changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Listen for system theme changes when in 'auto' mode
  useEffect(() => {
    if (theme !== 'auto') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      applyTheme('auto');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('dujyo_theme', newTheme);
    applyTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, effectiveTheme }}>
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
