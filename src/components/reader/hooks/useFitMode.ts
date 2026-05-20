import { useState, useCallback } from "react";
import type { FitMode } from "@/types/preferences";
import { updatePreferences } from "@/app/actions/preferences";

export type { FitMode };

const FIT_MODES: readonly FitMode[] = ["fit", "width", "height", "original"];

export const useFitMode = (initial: FitMode = "fit") => {
  const [fitMode, setFitMode] = useState<FitMode>(initial);

  const cycleFitMode = useCallback(() => {
    setFitMode((prev) => {
      const next = FIT_MODES[(FIT_MODES.indexOf(prev) + 1) % FIT_MODES.length];
      updatePreferences({ readerFitMode: next }).catch((_err: unknown) => undefined);
      return next;
    });
  }, []);

  return { fitMode, setFitMode, cycleFitMode };
};
