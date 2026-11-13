import { useState, useEffect } from "react";

/**
 * Whether the viewport is landscape. `null` until the first measurement after
 * mount, so callers can tell the initial reading from a real rotation.
 */
export const useOrientation = (): boolean | null => {
  const [isLandscape, setIsLandscape] = useState<boolean | null>(null);

  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    checkOrientation();
    window.addEventListener("resize", checkOrientation);

    return () => {
      window.removeEventListener("resize", checkOrientation);
    };
  }, []);

  return isLandscape;
};
