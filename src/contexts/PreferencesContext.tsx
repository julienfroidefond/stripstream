"use client";

import React, { createContext, useContext, useState } from "react";
import { ERROR_CODES } from "../constants/errorCodes";
import { AppError } from "../utils/errors";
import type { UserPreferences } from "@/types/preferences";
import { defaultPreferences } from "@/types/preferences";

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
  const [preferences, setPreferences] = useState<UserPreferences>(
    initialPreferences || defaultPreferences
  );
  const [isLoading, setIsLoading] = useState(true);

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
    } catch (error) {
      console.error("Erreur lors de la récupération des préférences:", error);
      setPreferences(defaultPreferences);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreferences = async (newPreferences: Partial<UserPreferences>) => {
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

      await fetchPreferences();

      return updatedPreferences;
    } catch (error) {
      console.error("Erreur lors de la mise à jour des préférences:", error);
      throw error;
    }
  };

  return (
    <PreferencesContext.Provider value={{ preferences, updatePreferences, isLoading }}>
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
