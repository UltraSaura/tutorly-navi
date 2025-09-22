import React, { createContext, useContext, useState } from 'react';

interface OverlayContextType {
  hasActiveOverlay: boolean;
  setHasActiveOverlay: (active: boolean) => void;
}

const OverlayContext = createContext<OverlayContextType | undefined>(undefined);

export const OverlayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasActiveOverlay, setHasActiveOverlay] = useState(false);

  return (
    <OverlayContext.Provider value={{ hasActiveOverlay, setHasActiveOverlay }}>
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