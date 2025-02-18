"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { UserPreferences } from "@/lib/services/preferences.service";

interface PreferencesContextType {
  preferences: UserPreferences;
  updatePreferences: (newPreferences: Partial<UserPreferences>) => Promise<void>;
  isLoading: boolean;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>({
    showThumbnails: true,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const response = await fetch("/api/preferences");
        if (!response.ok) throw new Error("Erreur lors de la récupération des préférences");
        const data = await response.json();
        setPreferences(data);
      } catch (error) {
        console.error("Erreur lors de la récupération des préférences:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreferences();
  }, []);

  const updatePreferences = async (newPreferences: Partial<UserPreferences>) => {
    try {
      const response = await fetch("/api/preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newPreferences),
      });

      if (!response.ok) throw new Error("Erreur lors de la mise à jour des préférences");

      const updatedPreferences = await response.json();
      setPreferences(updatedPreferences);
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
    throw new Error("usePreferences must be used within a PreferencesProvider");
  }
  return context;
}
