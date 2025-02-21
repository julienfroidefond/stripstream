import { useState, useEffect } from "react";

type ReadingDirection = "ltr" | "rtl";

export const useReadingDirection = () => {
  const [direction, setDirection] = useState<ReadingDirection>(() => {
    if (typeof window !== "undefined") {
      const savedDirection = localStorage.getItem("reading-direction") as ReadingDirection;
      return savedDirection === "rtl" ? "rtl" : "ltr";
    }
    return "ltr";
  });

  useEffect(() => {
    localStorage.setItem("reading-direction", direction);
  }, [direction]);

  const toggleDirection = () => {
    setDirection((prev) => (prev === "ltr" ? "rtl" : "ltr"));
  };

  return {
    direction,
    setDirection,
    toggleDirection,
    isRTL: direction === "rtl",
  };
};
