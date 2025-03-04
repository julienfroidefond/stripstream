"use client";

import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export function LoadingBar() {
  const [isLoading, setIsLoading] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const pendingRequestsRef = useRef<number>(0);

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
        if (pendingRequestsRef.current === 0) {
          setIsLoading(false);
        }
      }, 300);
    };

    window.addEventListener("navigationStart", handleStart);
    window.addEventListener("navigationComplete", handleStop);

    return () => {
      window.removeEventListener("navigationStart", handleStart);
      window.removeEventListener("navigationComplete", handleStop);
    };
  }, []);

  useEffect(() => {
    const originalFetch = window.fetch;
    
    window.fetch = async function(...args) {
      const url = args[0].toString();
      const isStaticRequest = /\.(css|js|png|jpg|jpeg|gif|webp|svg|ico|mp3|mp4|webm|ttf|woff|woff2)$/.test(url);
      
      if (!isStaticRequest) {
        pendingRequestsRef.current++;
        setIsLoading(true);
      }
      
      try {
        const response = await originalFetch.apply(this, args);
        return response;
      } finally {
        if (!isStaticRequest) {
          pendingRequestsRef.current = Math.max(0, pendingRequestsRef.current - 1);
          
          if (pendingRequestsRef.current === 0) {
            setTimeout(() => {
              setIsLoading(false);
            }, 200);
          }
        }
      }
    };

    return () => {
      window.fetch = originalFetch;
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
