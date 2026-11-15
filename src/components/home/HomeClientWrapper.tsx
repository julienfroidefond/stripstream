"use client";

import type { ReactNode } from "react";

interface HomeClientWrapperProps {
  children: ReactNode;
}

export function HomeClientWrapper({ children }: HomeClientWrapperProps) {
  return (
    <main className="relative isolate overflow-hidden">
      <div className="container relative z-10 mx-auto px-4 pb-8">
        {children}
      </div>
    </main>
  );
}
