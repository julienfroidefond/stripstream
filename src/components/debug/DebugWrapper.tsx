"use client";

import { usePreferences } from "@/contexts/PreferencesContext";
import { DebugInfo } from "./DebugInfo";

export function DebugWrapper() {
  const { preferences } = usePreferences();

  if (!preferences.debug) {
    return null;
  }

  return <DebugInfo />;
}
