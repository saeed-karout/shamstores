// src/context/ThemeContext.tsx

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react'; // ✅ أضف useState و useEffect

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
  primaryColor: '#084835',
  secondaryColor: '#C07CDF',
  backgroundColor: '#F4F7F4',
  cardBgColor: '#FFFFFF',
  surfaceColor: '#F1F5F2',
  textColor: '#10231B',
  mutedColor: '#5F736A',
  accentColor: '#084835',
  fontFamily: 'Cairo, sans-serif',
};

const ThemeContext = createContext<ThemeContextType>({
  ...defaultColors,
  setThemeColors: () => {},
});

export const useTheme = () => useContext(ThemeContext);

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
    
    console.log('🎨 Theme colors applied to CSS variables');
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