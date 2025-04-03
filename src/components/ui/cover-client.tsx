"use client";

import { ImageOff } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
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
        src={imageUrl}
        alt={alt}
        fill
        className={cn(
          "object-cover transition-opacity duration-300 rounded-lg",
          isCompleted && "opacity-50",
          className
        )}
        onError={() => setImageError(true)}
        onLoad={() => setIsLoading(false)}
        loading="lazy"
        unoptimized
      />
    </div>
  );
};
