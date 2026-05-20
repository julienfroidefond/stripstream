import { useState } from "react";
import type { ReadingDirection } from "@/types/preferences";
import { updatePreferences } from "@/app/actions/preferences";

export const useReadingDirection = (initial: ReadingDirection = "ltr") => {
  const [direction, setDirection] = useState<ReadingDirection>(initial);

  const toggleDirection = () => {
    setDirection((prev) => {
      const next = prev === "ltr" ? "rtl" : "ltr";
      updatePreferences({ readingDirection: next }).catch((_err: unknown) => undefined);
      return next;
    });
  };

  return {
    direction,
    setDirection,
    toggleDirection,
    isRTL: direction === "rtl",
  };
};
