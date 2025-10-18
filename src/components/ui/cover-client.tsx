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
  const [retryCount, setRetryCount] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset état quand l'URL change
  useEffect(() => {
    setImageError(false);
    setIsLoading(true);
    setRetryCount(0);
  }, [imageUrl]);

  // Timeout de sécurité : si l'image ne se charge pas en 30 secondes, on arrête le loading
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        setImageError(true);
      }
    }, 30000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [imageUrl, isLoading, retryCount]);

  // Si en erreur, réessayer automatiquement après 2 secondes
  useEffect(() => {
    if (imageError) {
      const timer = setTimeout(() => {
        setImageError(false);
        setIsLoading(true);
        setRetryCount(prev => prev + 1);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [imageError]);

  const handleLoad = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsLoading(false);
    setImageError(false);
  };

  const handleError = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setImageError(true);
    setIsLoading(false);
  };

  // Ajouter un timestamp pour forcer le rechargement en cas de retry
  const imageUrlWithRetry = retryCount > 0 
    ? `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}retry=${retryCount}`
    : imageUrl;

  if (imageError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/80 backdrop-blur-md rounded-lg">
        <ImageOff className="w-12 h-12 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <ImageLoader isLoading={isLoading} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrlWithRetry}
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
