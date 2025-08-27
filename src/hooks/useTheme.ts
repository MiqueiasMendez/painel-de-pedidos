import React, { useState, useEffect, useCallback } from 'react';

// Theme interface defined inline to avoid circular dependency
interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    warning: string;
    success: string;
    info: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
}

const THEMES = {
  light: {
    name: 'light',
    colors: {
      primary: '#ff6500',
      secondary: '#ff8533',
      background: '#f3f4f6',
      surface: '#ffffff',
      text: '#111827',
      textSecondary: '#6b7280',
      border: '#e5e7eb',
      error: '#ef4444',
      warning: '#f59e0b',
      success: '#10b981',
      info: '#3b82f6'
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
    }
  },
  dark: {
    name: 'dark',
    colors: {
      primary: '#ff6500',
      secondary: '#ff8533',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f1f5f9',
      textSecondary: '#94a3b8',
      border: '#334155',
      error: '#f87171',
      warning: '#fbbf24',
      success: '#34d399',
      info: '#60a5fa'
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
    }
  }
} as const;

type ThemeName = keyof typeof THEMES;

export function useTheme() {
  const [themeName, setThemeName] = useState<ThemeName>(() => {
    const saved = localStorage.getItem('theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'light';
  });

  useEffect(() => {
    localStorage.setItem('theme', themeName);
  }, [themeName]);

  const toggleTheme = useCallback(() => {
    setThemeName(current => current === 'light' ? 'dark' : 'light');
  }, []);

  return {
    theme: THEMES[themeName],
    themeName,
    toggleTheme,
    setTheme: setThemeName
  };
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps): React.JSX.Element {
  return React.createElement(React.Fragment, null, children);
}
