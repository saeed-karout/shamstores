// frontend/src/contexts/SettingsContext.tsx

import React, { createContext, useContext, ReactNode } from 'react';
import { useSettings, UseSettingsReturn } from '../hooks/useSettings';

const SettingsContext = createContext<UseSettingsReturn | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const settings = useSettings();
  
  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettingsContext = (): UseSettingsReturn => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettingsContext must be used within a SettingsProvider');
  }
  return context;
};