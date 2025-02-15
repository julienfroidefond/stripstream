"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ImageLoaderProps {
  isLoading: boolean;
}

export function ImageLoader({ isLoading }: ImageLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isLoading) {
      setShow(true);
      setProgress(0);
      const duration = 2000; // 2 secondes
      const steps = 20;
      const increment = 90 / steps; // On va jusqu'à 90% max en simulation
      const stepDuration = duration / steps;

      let currentStep = 0;
      const interval = setInterval(() => {
        currentStep++;
        if (currentStep <= steps) {
          setProgress((prev) => {
            const next = prev + increment;
            return Math.min(next, 90); // Ne pas dépasser 90%
          });
        } else {
          clearInterval(interval);
        }
      }, stepDuration);

      return () => clearInterval(interval);
    } else {
      setProgress(100);
      timeout = setTimeout(() => {
        setShow(false);
      }, 200);
    }

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [isLoading]);

  if (!show) return null;

  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center bg-muted/60 backdrop-blur-[2px] gap-2",
        "transition-opacity duration-200",
        isLoading ? "opacity-100" : "opacity-0"
      )}
    >
      <div className="flex flex-col items-center gap-2 bg-background/90 px-4 py-3 rounded-lg shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground font-medium">{Math.round(progress)}%</span>
      </div>
    </div>
  );
}
