"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { ERROR_CODES } from "../constants/errorCodes";
import { AppError } from "../utils/errors";
import type { UserPreferences } from "@/types/preferences";
import { defaultPreferences } from "@/types/preferences";
import logger from "@/lib/logger";

interface PreferencesContextType {
  preferences: UserPreferences;
  updatePreferences: (newPreferences: Partial<UserPreferences>) => Promise<void>;
  isLoading: boolean;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

// Module-level flag to prevent duplicate fetches (survives StrictMode remounts)
let preferencesFetchInProgress = false;
let preferencesFetched = false;

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
  const [isLoading, setIsLoading] = useState(false);

  // Check if we have valid initial preferences from server
  const hasValidInitialPreferences =
    initialPreferences && Object.keys(initialPreferences).length > 0;

  const fetchPreferences = useCallback(async () => {
    // Prevent concurrent fetches
    if (preferencesFetchInProgress || preferencesFetched) {
      return;
    }
    preferencesFetchInProgress = true;

    try {
      const response = await fetch("/api/preferences");
      if (!response.ok) {
        throw new AppError(ERROR_CODES.PREFERENCES.FETCH_ERROR);
      }
      const data = await response.json();
      setPreferences({
        ...defaultPreferences,
        ...data,
        displayMode: {
          ...defaultPreferences.displayMode,
          ...(data.displayMode || {}),
          viewMode: data.displayMode?.viewMode || defaultPreferences.displayMode.viewMode,
        },
      });
      preferencesFetched = true;
    } catch (error) {
      logger.error({ err: error }, "Erreur lors de la récupération des préférences");
      setPreferences(defaultPreferences);
    } finally {
      setIsLoading(false);
      preferencesFetchInProgress = false;
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      // Skip refetch if we already have valid initial preferences from server
      if (hasValidInitialPreferences) {
        preferencesFetched = true; // Mark as fetched since we have server data
        return;
      }
      fetchPreferences();
    } else if (status === "unauthenticated") {
      // Reset to defaults when user logs out
      setPreferences(defaultPreferences);
      preferencesFetched = false; // Allow refetch on next login
    }
  }, [status, fetchPreferences, hasValidInitialPreferences]);

  const updatePreferences = useCallback(async (newPreferences: Partial<UserPreferences>) => {
    try {
      const response = await fetch("/api/preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newPreferences),
      });

      if (!response.ok) {
        throw new AppError(ERROR_CODES.PREFERENCES.UPDATE_ERROR);
      }

      const updatedPreferences = await response.json();

      setPreferences((prev) => ({
        ...prev,
        ...updatedPreferences,
      }));

      return updatedPreferences;
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
