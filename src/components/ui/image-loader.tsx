"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ImageLoaderProps {
  isLoading: boolean;
}

export const ImageLoader = ({ isLoading }: ImageLoaderProps) => {
  return (
    <div
      className={cn(
        "absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[2px] transition-opacity duration-300",
        isLoading ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      <div className="relative h-8 w-8">
        <div className="absolute inset-0 rounded-full border-2 border-muted/40" />
        <div className="absolute inset-0 rounded-full border-2 border-primary/80 border-t-transparent animate-spin" />
      </div>
    </div>
  );
};
