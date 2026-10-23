import { useState } from "react";
import type { ReadingDirection } from "@/types/preferences";
import { updatePreferences } from "@/app/actions/preferences";

export const useReadingDirection = (initial: ReadingDirection = "ltr") => {
  const [direction, setDirection] = useState<ReadingDirection>(initial);

  const toggleDirection = () => {
    // La server action reste hors de l'updater : React l'exécute pendant le
    // rendu, et l'action met à jour le routeur.
    const next = direction === "ltr" ? "rtl" : "ltr";
    setDirection(next);
    updatePreferences({ readingDirection: next }).catch((_err: unknown) => undefined);
  };

  return {
    direction,
    setDirection,
    toggleDirection,
    isRTL: direction === "rtl",
  };
};
