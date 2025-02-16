import { ThumbnailProps } from "../types";
import { ImageLoader } from "@/components/ui/image-loader";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { forwardRef, useEffect, useState } from "react";

export const Thumbnail = forwardRef<HTMLButtonElement, ThumbnailProps>(
  (
    {
      pageNumber,
      currentPage,
      onPageChange,
      getThumbnailUrl,
      loadedThumbnails,
      onThumbnailLoad,
      isVisible,
    },
    ref
  ) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      if (isVisible) {
        const url = getThumbnailUrl(pageNumber);
        setImageUrl(url);
        if (!loadedThumbnails[pageNumber]) {
          setIsLoading(true);
        }
      }
    }, [isVisible, pageNumber, getThumbnailUrl, loadedThumbnails]);

    const handleImageLoad = () => {
      setIsLoading(false);
      if (!loadedThumbnails[pageNumber]) {
        onThumbnailLoad(pageNumber);
      }
    };

    return (
      <button
        ref={ref}
        data-page={pageNumber}
        id={`thumbnail-${pageNumber}`}
        onClick={() => onPageChange(pageNumber)}
        className={`relative h-56 w-40 flex-shrink-0 rounded-md overflow-hidden transition-all cursor-pointer snap-center ${
          currentPage === pageNumber
            ? "ring-2 ring-primary scale-110 z-10"
            : "opacity-80 hover:opacity-100 hover:scale-105"
        }`}
      >
        <ImageLoader isLoading={isLoading} />
        {isVisible && imageUrl && (
          <Image
            src={imageUrl}
            alt={`Miniature page ${pageNumber}`}
            className={cn(
              "object-cover transition-opacity duration-300",
              isLoading ? "opacity-0" : "opacity-100"
            )}
            fill
            sizes="100px"
            loading="lazy"
            quality={50}
            onLoad={handleImageLoad}
          />
        )}
        <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-center">
          <span className="text-sm text-white font-medium">{pageNumber}</span>
        </div>
      </button>
    );
  }
);

Thumbnail.displayName = "Thumbnail";
