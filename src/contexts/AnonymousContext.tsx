"use client";

import React, { createContext, useContext, useMemo, useCallback, useState } from "react";
import { usePreferences } from "@/contexts/PreferencesContext";

interface AnonymousContextType {
  isAnonymous: boolean;
  toggleAnonymous: () => Promise<void>;
}

const AnonymousContext = createContext<AnonymousContextType | undefined>(undefined);

export function AnonymousProvider({ children }: { children: React.ReactNode }) {
  const { preferences, updatePreferences } = usePreferences();
  const [isAnonymous, setIsAnonymous] = useState(preferences.anonymousMode);

  const toggleAnonymous = useCallback(async () => {
    const next = !isAnonymous;
    setIsAnonymous(next);
    try {
      await updatePreferences({ anonymousMode: next });
    } catch (error) {
      setIsAnonymous(!next);
      throw error;
    }
  }, [isAnonymous, updatePreferences]);

  const contextValue = useMemo(
    () => ({ isAnonymous, toggleAnonymous }),
    [isAnonymous, toggleAnonymous]
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
