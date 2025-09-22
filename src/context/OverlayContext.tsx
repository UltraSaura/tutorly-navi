import React, { createContext, useContext, useState } from 'react';

interface OverlayContextType {
  hasActiveOverlay: boolean;
  registerOverlay: (id: string) => void;
  unregisterOverlay: (id: string) => void;
}

const OverlayContext = createContext<OverlayContextType | undefined>(undefined);

export const OverlayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeOverlays, setActiveOverlays] = useState<Set<string>>(new Set());

  const registerOverlay = (id: string) => {
    setActiveOverlays(prev => new Set(prev).add(id));
  };

  const unregisterOverlay = (id: string) => {
    setActiveOverlays(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const hasActiveOverlay = activeOverlays.size > 0;

  return (
    <OverlayContext.Provider value={{ hasActiveOverlay, registerOverlay, unregisterOverlay }}>
      {children}
    </OverlayContext.Provider>
  );
};

export const useOverlay = () => {
  const context = useContext(OverlayContext);
  if (context === undefined) {
    throw new Error('useOverlay must be used within an OverlayProvider');
  }
  return context;
};