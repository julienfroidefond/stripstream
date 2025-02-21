"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export function LoadingBar() {
  const [isLoading, setIsLoading] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  useEffect(() => {
    const handleStart = () => {
      setIsLoading(true);
    };

    const handleStop = () => {
      setTimeout(() => {
        setIsLoading(false);
      }, 300);
    };

    window.addEventListener("navigationStart", handleStart);
    window.addEventListener("navigationComplete", handleStop);

    return () => {
      window.removeEventListener("navigationStart", handleStart);
      window.removeEventListener("navigationComplete", handleStop);
    };
  }, []);

  if (!shouldRender) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50",
        "bg-background/80 backdrop-blur-sm",
        "flex items-center justify-center",
        isLoading ? "opacity-100" : "opacity-0 transition-opacity duration-500"
      )}
    >
      <div className="flex flex-col items-center gap-2 px-4 py-2 rounded-lg bg-background/50 backdrop-blur-sm shadow-lg">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </div>
    </div>
  );
}
