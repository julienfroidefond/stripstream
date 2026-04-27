import { useState, useCallback } from "react";

export type FitMode = "fit" | "width" | "height" | "original";

const FIT_MODES: readonly FitMode[] = ["fit", "width", "height", "original"];

// Pas de persistance : à chaque ouverture du reader, on revient à "page entière".
export const useFitMode = () => {
  const [fitMode, setFitMode] = useState<FitMode>("fit");

  const cycleFitMode = useCallback(() => {
    setFitMode((prev) => {
      const idx = FIT_MODES.indexOf(prev);
      return FIT_MODES[(idx + 1) % FIT_MODES.length];
    });
  }, []);

  return { fitMode, setFitMode, cycleFitMode };
};
