"use client";

import React, { createContext, useContext, useMemo, useCallback } from "react";
import { usePreferences } from "@/contexts/PreferencesContext";
import { AppError } from "@/utils/errors";
import { ERROR_CODES } from "@/constants/errorCodes";

interface AnonymousContextType {
  isAnonymous: boolean;
  toggleAnonymous: () => Promise<void>;
}

const AnonymousContext = createContext<AnonymousContextType | undefined>(undefined);

export function AnonymousProvider({ children }: { children: React.ReactNode }) {
  const { preferences, updatePreferences } = usePreferences();
  const isAnonymous = preferences.anonymousMode;

  const toggleAnonymous = useCallback(async () => {
    const saved = await updatePreferences({ anonymousMode: !preferences.anonymousMode });
    if (!saved) {
      throw new AppError(ERROR_CODES.PREFERENCES.UPDATE_ERROR);
    }
  }, [preferences.anonymousMode, updatePreferences]);

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
