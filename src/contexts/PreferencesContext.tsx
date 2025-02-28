"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { ERROR_CODES } from "../constants/errorCodes";
import { AppError } from "../utils/errors";
import { UserPreferences, defaultPreferences } from "@/types/preferences";

interface PreferencesContextType {
  preferences: UserPreferences;
  updatePreferences: (newPreferences: Partial<UserPreferences>) => Promise<void>;
  isLoading: boolean;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

const isAuthenticated = (): boolean => {
  if (typeof window === "undefined") return false;

  const userCookie = document.cookie.split("; ").find((row) => row.startsWith("stripUser="));

  if (!userCookie) return false;

  try {
    const userData = JSON.parse(atob(userCookie.split("=")[1]));
    return userData?.authenticated === true;
  } catch (error) {
    console.error("Error parsing user cookie:", error);
    return false;
  }
};

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPreferences = async () => {
    if (!isAuthenticated()) {
      setIsLoading(false);
      return;
    }

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

  useEffect(() => {
    fetchPreferences();
  }, []);

  const updatePreferences = async (newPreferences: Partial<UserPreferences>) => {
    if (!isAuthenticated()) {
      throw new AppError(ERROR_CODES.AUTH.UNAUTHENTICATED);
    }

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
