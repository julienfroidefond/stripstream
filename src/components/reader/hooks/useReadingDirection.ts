import { useState } from "react";
import type { ReadingDirection } from "@/types/preferences";
import { usePreferences } from "@/contexts/PreferencesContext";

export const useReadingDirection = (initial: ReadingDirection = "ltr") => {
  const { updatePreferences } = usePreferences();
  const [direction, setDirection] = useState<ReadingDirection>(initial);

  const toggleDirection = () => {
    const next = direction === "ltr" ? "rtl" : "ltr";
    setDirection(next);
    void updatePreferences({ readingDirection: next });
  };

  return {
    direction,
    setDirection,
    toggleDirection,
    isRTL: direction === "rtl",
  };
};
