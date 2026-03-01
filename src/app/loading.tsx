"use client";

import { useEffect, useState } from "react";

const SHOW_DELAY_MS = 140;

export default function AppLoading() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsVisible(true);
    }, SHOW_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <main
      className={`flex min-h-screen items-center justify-center px-6 transition-opacity duration-300 motion-reduce:transition-none ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
        <div className="space-y-2">
          <p className="bg-gradient-to-r from-primary via-cyan-500 to-fuchsia-500 bg-clip-text text-xl font-bold uppercase tracking-[0.12em] text-transparent">
            StripStream
          </p>
          <p className="text-sm text-muted-foreground">Chargement de votre bibliotheque...</p>
        </div>

        <div className="flex items-center gap-2" aria-hidden>
          <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-200ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-500 [animation-delay:-100ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-fuchsia-500" />
        </div>

        <div className="relative h-1.5 w-56 overflow-hidden rounded-full bg-muted/80" aria-hidden>
          <div className="animate-loader-slide absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-primary via-cyan-500 to-fuchsia-500" />
        </div>
      </div>
    </main>
  );
}
