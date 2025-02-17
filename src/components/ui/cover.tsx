"use client";

import { ImageOff } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
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

  const getImageUrl = () => {
    if (type === "series") {
      return `/api/komga/images/series/${id}/thumbnail`;
    }
    return `/api/komga/images/books/${id}/thumbnail`;
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
      <Image
        src={getImageUrl()}
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
    </div>
  );
}
