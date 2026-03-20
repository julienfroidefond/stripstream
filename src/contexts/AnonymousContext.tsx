"use client";

import React, { createContext, useContext, useMemo, useCallback } from "react";
import { usePreferences } from "@/contexts/PreferencesContext";

interface AnonymousContextType {
  isAnonymous: boolean;
  toggleAnonymous: () => void;
}

const AnonymousContext = createContext<AnonymousContextType | undefined>(undefined);

export function AnonymousProvider({ children }: { children: React.ReactNode }) {
  const { preferences, updatePreferences } = usePreferences();

  const toggleAnonymous = useCallback(() => {
    updatePreferences({ anonymousMode: !preferences.anonymousMode });
  }, [preferences.anonymousMode, updatePreferences]);

  const contextValue = useMemo(
    () => ({ isAnonymous: preferences.anonymousMode, toggleAnonymous }),
    [preferences.anonymousMode, toggleAnonymous]
  );

  return <AnonymousContext.Provider value={contextValue}>{children}</AnonymousContext.Provider>;
}

export function useAnonymous() {
  const context = useContext(AnonymousContext);
  if (context === undefined) {
    throw new Error("useAnonymous must be used within an AnonymousProvider");
  }
  return context;
}
