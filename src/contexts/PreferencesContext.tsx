"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, useSyncExternalStore } from "react";
import { useSession } from "next-auth/react";
import { ERROR_CODES } from "../constants/errorCodes";
import { AppError } from "../utils/errors";
import type { UserPreferences } from "@/types/preferences";
import { defaultPreferences } from "@/types/preferences";
import logger from "@/lib/logger";
import { updatePreferences as updatePreferencesAction } from "@/app/actions/preferences";
import {
  PreferencesWriter,
  type PreferencesPatch,
  type PreferencesWriteOptions,
} from "@/lib/preferences/preferences-writer";
import { useToast } from "@/components/ui/use-toast";
import { useTranslate } from "@/hooks/useTranslate";

export interface PreferencesContextType {
  preferences: UserPreferences;
  updatePreferences: (
    newPreferences: PreferencesPatch,
    options?: PreferencesWriteOptions
  ) => Promise<boolean>;
  flushPreferences: () => Promise<void>;
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
  const { t } = useTranslate();
  const { toast } = useToast();
  const hasSyncedAuthenticatedPreferences = useRef(false);

  const persistPreferences = useCallback(
    async (patch: PreferencesPatch): Promise<UserPreferences> => {
      const result = await updatePreferencesAction(patch);

      if (!result.success) {
        throw new AppError(ERROR_CODES.PREFERENCES.UPDATE_ERROR);
      }

      return result.data;
    },
    []
  );

  // Le writer est créé une seule fois : les changements de langue ou de toast
  // passent par `setNotify`, ils ne réinitialisent pas l'état optimiste.
  const [writer] = useState(
    () =>
      new PreferencesWriter({
        initial: initialPreferences || defaultPreferences,
        persist: persistPreferences,
      })
  );

  const preferences = useSyncExternalStore(
    writer.subscribe,
    writer.getSnapshot,
    writer.getSnapshot
  );
  const isLoading = false;

  useEffect(() => {
    writer.setNotify((event) => {
      if (event.type === "failed") {
        logger.error({ err: event.error }, "Erreur lors de la mise à jour des préférences");
        if (event.feedback !== "silent") {
          toast({
            variant: "destructive",
            title: t("settings.error.title"),
            description: t("settings.error.message"),
          });
        }
        return;
      }

      if (event.feedback === "all") {
        toast({
          title: t("settings.title"),
          description: t("settings.komga.messages.configSaved"),
        });
      }
    });
  }, [t, toast, writer]);

  // Check if we have valid initial preferences from server
  const hasValidInitialPreferences =
    initialPreferences && Object.keys(initialPreferences).length > 0;

  useEffect(() => {
    if (
      status === "authenticated" &&
      hasValidInitialPreferences &&
      !hasSyncedAuthenticatedPreferences.current
    ) {
      writer.reset(initialPreferences || defaultPreferences);
      hasSyncedAuthenticatedPreferences.current = true;
      return;
    }

    if (status === "unauthenticated") {
      // Reset to defaults when user logs out
      writer.reset(defaultPreferences);
      hasSyncedAuthenticatedPreferences.current = false;
    }
  }, [status, hasValidInitialPreferences, initialPreferences, writer]);

  // Dernière chance pour les sliders : quitter la page ne doit pas perdre la
  // valeur affichée. Le flush de démontage couvre aussi les transitions.
  useEffect(() => {
    const flush = () => {
      void writer.flush();
    };
    const flushWhenHidden = () => {
      if (document.visibilityState === "hidden") {
        flush();
      }
    };

    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flushWhenHidden);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flushWhenHidden);
      flush();
    };
  }, [writer]);

  const contextValue = useMemo(
    () => ({
      preferences,
      updatePreferences: writer.update,
      flushPreferences: writer.flush,
      isLoading,
    }),
    [preferences, writer, isLoading]
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
