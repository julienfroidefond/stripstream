"use client";

import { useState, useRef, useEffect } from "react";
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
  const imgRef = useRef<HTMLImageElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="relative w-full h-full">
      <ImageLoader isLoading={isLoading} />
      <img
        ref={imgRef}
        src={imageUrl}
        alt={alt}
        loading="lazy"
        className={cn(
          "absolute inset-0 w-full h-full object-cover rounded-lg",
          isCompleted && "opacity-50",
          className
        )}
        onLoad={() => setIsLoading(false)}
        onError={() => setIsLoading(false)}
      />
    </div>
  );
};
