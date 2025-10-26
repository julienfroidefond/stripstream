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
  const [hasLoadedPrefs, setHasLoadedPrefs] = useState(!!initialPreferences);

  const fetchPreferences = async () => {
    try {
      const response = await fetch("/api/preferences");
      if (!response.ok) {
        throw new AppError(ERROR_CODES.PREFERENCES.FETCH_ERROR);
      }
      const data = await response.json();
      setPreferences({
        ...defaultPreferences,
        ...data,
      });
      setHasLoadedPrefs(true);
    } catch (error) {
      logger.error({ err: error }, "Erreur lors de la récupération des préférences");
      setPreferences(defaultPreferences);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Recharger les préférences quand la session change (connexion/déconnexion)
    if (status === "authenticated" && !hasLoadedPrefs) {
      fetchPreferences();
    } else if (status === "unauthenticated") {
      // Réinitialiser aux préférences par défaut quand l'utilisateur se déconnecte
      setPreferences(defaultPreferences);
      setHasLoadedPrefs(false);
    }
  }, [status, hasLoadedPrefs]);

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

  return (
    <PreferencesContext.Provider value={contextValue}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new AppError(ERROR_CODES.PREFERENCES.CONTEXT_ERROR);
  }
  return context;
}
