"use client";

import type { ReactNode } from "react";

import { RefreshButton } from "@/components/common/RefreshButton";
import { RefreshSurface } from "@/components/common/RefreshSurface";

interface HomeClientWrapperProps {
  children: ReactNode;
}

export function HomeClientWrapper({ children }: HomeClientWrapperProps) {
  return (
    <RefreshSurface scope="home" id="home">
      <main className="relative isolate overflow-hidden">
        <div className="container relative z-10 mx-auto px-4 pb-8 pt-3">
          <div className="mb-6 hidden justify-end md:flex">
            <RefreshButton />
          </div>
          {children}
        </div>
      </main>
    </RefreshSurface>
  );
}
