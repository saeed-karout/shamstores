// src/context/ThemeContext.tsx

import React, { createContext, useContext, ReactNode } from 'react';

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

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: ReactNode;
  initialColors?: Partial<ThemeColors>;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, initialColors }) => {
  const [colors, setColors] = React.useState<ThemeColors>({
    ...defaultColors,
    ...initialColors,
  });

  const setThemeColors = (newColors: Partial<ThemeColors>) => {
    setColors(prev => ({ ...prev, ...newColors }));
  };

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