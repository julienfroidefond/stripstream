"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { ERROR_CODES } from "../constants/errorCodes";
import { AppError } from "../utils/errors";
import type { UserPreferences } from "@/types/preferences";
import { defaultPreferences } from "@/types/preferences";
import logger from "@/lib/logger";
import { updatePreferences as updatePreferencesAction } from "@/app/actions/preferences";

interface PreferencesContextType {
  preferences: UserPreferences;
  updatePreferences: (newPreferences: Partial<UserPreferences>) => Promise<UserPreferences | undefined>;
  isLoading: boolean;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({
  children,
  initialPreferences,
}: {
  children: React.ReactNode;
  initialPreferences?: UserPreferences;
}) {
  const { status } = useSession();
  const [preferences, setPreferences] = useState<UserPreferences>(
    initialPreferences || defaultPreferences
  );
  const isLoading = false;

  // Check if we have valid initial preferences from server
  const hasValidInitialPreferences =
    initialPreferences && Object.keys(initialPreferences).length > 0;

  useEffect(() => {
    if (status === "authenticated" && hasValidInitialPreferences) {
      setPreferences(initialPreferences);
      return;
    }

    if (status === "unauthenticated") {
      // Reset to defaults when user logs out
      setPreferences(defaultPreferences);
    }
  }, [status, hasValidInitialPreferences, initialPreferences]);

  const updatePreferences = useCallback(async (newPreferences: Partial<UserPreferences>): Promise<UserPreferences | undefined> => {
    try {
      const result = await updatePreferencesAction(newPreferences);

      if (!result.success) {
        throw new AppError(ERROR_CODES.PREFERENCES.UPDATE_ERROR);
      }

      if (result.data) {
        setPreferences((prev) => ({
          ...prev,
          ...result.data,
        }));
      }

      return result.data;
    } catch (error) {
      logger.error({ err: error }, "Erreur lors de la mise à jour des préférences");
      throw error;
    }
  }, []);

  const contextValue = useMemo(
    () => ({ preferences, updatePreferences, isLoading }),
    [preferences, updatePreferences, isLoading]
  );

  return <PreferencesContext.Provider value={contextValue}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new AppError(ERROR_CODES.PREFERENCES.CONTEXT_ERROR);
  }
  return context;
}
