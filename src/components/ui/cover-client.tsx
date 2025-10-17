"use client";

import { ImageOff } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { ImageLoader } from "@/components/ui/image-loader";

interface CoverClientProps {
  imageUrl: string;
  alt: string;
  className?: string;
  isCompleted?: boolean;
}

export const CoverClient = ({
  imageUrl,
  alt,
  className,
  isCompleted = false,
}: CoverClientProps) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Timeout de sécurité : si l'image ne se charge pas en 10 secondes, on arrête le loading
  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      if (isLoading) {
        console.warn("Image loading timeout for:", imageUrl);
        setIsLoading(false);
      }
    }, 10000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [imageUrl, isLoading]);

  const handleLoad = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsLoading(false);
  };

  const handleError = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    console.error("Image loading error for:", imageUrl);
    setImageError(true);
  };

  if (imageError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg">
        <ImageOff className="w-12 h-12 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <ImageLoader isLoading={isLoading} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={alt}
        loading="lazy"
        className={cn(
          "absolute inset-0 w-full h-full object-cover transition-opacity duration-300 rounded-lg",
          isCompleted && "opacity-50",
          className
        )}
        onError={handleError}
        onLoad={handleLoad}
      />
    </div>
  );
};
