"use client";

import { ImageOff } from "lucide-react";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { ImageLoader } from "@/components/ui/image-loader";

interface CoverProps {
  type: "series" | "book";
  id: string;
  alt?: string;
  className?: string;
  priority?: boolean;
  quality?: number;
  sizes?: string;
  isCompleted?: boolean;
}

export function Cover({
  type,
  id,
  alt = "Image de couverture",
  className,
  priority = false,
  quality = 80,
  sizes = "(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 20vw",
  isCompleted = false,
}: CoverProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInViewport, setIsInViewport] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const coverRef = useRef<HTMLDivElement>(null);

  const getImageUrl = () => {
    if (type === "series") {
      return `/api/komga/images/series/${id}/thumbnail`;
    }
    return `/api/komga/images/books/${id}/thumbnail`;
  };

  // Observer pour détecter quand la cover est dans le viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsInViewport(entry.isIntersecting);
          if (entry.isIntersecting && !imageUrl) {
            setImageUrl(getImageUrl());
          }
        });
      },
      {
        rootMargin: "50px", // Préchargement avant que l'élément soit visible
      }
    );

    const element = coverRef.current;
    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [id, imageUrl]);

  if (imageError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg">
        <ImageOff className="w-12 h-12 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div ref={coverRef} className="relative w-full h-full">
      <ImageLoader isLoading={isLoading} />
      {imageUrl && (
        <Image
          src={imageUrl}
          alt={alt}
          fill
          className={cn(
            "object-cover transition-opacity duration-300 rounded-lg",
            isLoading ? "opacity-0" : "opacity-100",
            isCompleted && "opacity-50",
            className
          )}
          sizes={sizes}
          onError={() => setImageError(true)}
          onLoad={() => setIsLoading(false)}
          loading={priority ? "eager" : "lazy"}
          quality={quality}
          priority={priority}
        />
      )}
    </div>
  );
}
