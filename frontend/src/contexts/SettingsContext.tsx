// frontend/src/context/ThemeContext.tsx

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';

interface ThemeColors {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  cardBgColor: string;
  surfaceColor: string;
  textColor: string;
  mutedColor: string;
  accentColor: string;
  fontFamily: string;
}

interface ThemeContextType {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  cardBgColor: string;
  surfaceColor: string;
  textColor: string;
  mutedColor: string;
  accentColor: string;
  fontFamily: string;
  setThemeColors: (colors: Partial<ThemeColors>) => void;
}

const defaultColors: ThemeColors = {
  primaryColor: '#3B82F6',
  secondaryColor: '#10B981',
  backgroundColor: '#082E24',
  cardBgColor: '#112E23',
  surfaceColor: '#0F3D31',
  textColor: '#E8F5E9',
  mutedColor: '#9DC4AC',
  accentColor: '#C8E235',
  fontFamily: 'Cairo, sans-serif',
};

const ThemeContext = createContext<ThemeContextType>({
  ...defaultColors,
  setThemeColors: () => {},
});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    console.warn('useTheme must be used within a ThemeProvider');
    return { ...defaultColors, setThemeColors: () => {} };
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
  initialColors?: Partial<ThemeColors>;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, initialColors }) => {
  const [colors, setColors] = useState<ThemeColors>({
    ...defaultColors,
    ...initialColors,
  });

  const setThemeColors = (newColors: Partial<ThemeColors>) => {
    setColors(prev => ({ ...prev, ...newColors }));
  };

  // ✅ تطبيق الألوان على CSS variables
  useEffect(() => {
    const root = document.documentElement;
    
    root.style.setProperty('--sham-primary', colors.primaryColor);
    root.style.setProperty('--sham-secondary', colors.secondaryColor);
    root.style.setProperty('--sham-bg', colors.backgroundColor);
    root.style.setProperty('--sham-card', colors.cardBgColor);
    root.style.setProperty('--sham-surface', colors.surfaceColor);
    root.style.setProperty('--sham-text', colors.textColor);
    root.style.setProperty('--sham-muted', colors.mutedColor);
    root.style.setProperty('--sham-accent', colors.accentColor);
    root.style.setProperty('--font-primary', colors.fontFamily);
    
    console.log('🎨 Theme colors applied to CSS variables:', {
      bg: colors.backgroundColor,
      card: colors.cardBgColor,
      accent: colors.accentColor
    });
  }, [colors]);

  return (
    <ThemeContext.Provider
      value={{
        ...colors,
        setThemeColors,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;