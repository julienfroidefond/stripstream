import type { ThumbnailProps } from "../types";
import { ImageLoader } from "@/components/ui/image-loader";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { forwardRef, useEffect, useState, useCallback, useRef, useImperativeHandle } from "react";

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
    const [hasError, setHasError] = useState(false);
    const [isInViewport, setIsInViewport] = useState(false);
    const loadAttempts = useRef(0);
    const maxAttempts = 1; // Désactivé pour réduire la charge sur Komga
    const internalRef = useRef<HTMLButtonElement>(null);

    useImperativeHandle(ref, () => internalRef.current as HTMLButtonElement);

    const resetLoadingState = useCallback(() => {
      setIsLoading(true);
      setHasError(false);
      loadAttempts.current = 0;
    }, []);

    // Observer pour détecter quand la thumbnail est dans le viewport
    useEffect(() => {
      //if (!isVisible) return; // Ne pas observer si la barre est cachée

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            setIsInViewport(entry.isIntersecting);
          });
        },
        {
          rootMargin: "50px",
        }
      );

      const element = internalRef.current;
      if (element) {
        observer.observe(element);
      }

      return () => {
        if (element) {
          observer.unobserve(element);
        }
      };
    }, [isVisible]);

    // Charger l'image uniquement quand la thumbnail est dans le viewport
    useEffect(() => {
      if (!isInViewport) return;

      try {
        const url = getThumbnailUrl(pageNumber);
        setImageUrl(url);
        // On réinitialise le loading uniquement si la miniature n'est pas déjà chargée
        if (!loadedThumbnails[pageNumber]) {
          resetLoadingState();
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error(`Erreur lors du chargement de la miniature ${pageNumber}:`, error);
        setHasError(true);
        setIsLoading(false);
      }
    }, [pageNumber, getThumbnailUrl, loadedThumbnails, resetLoadingState, isVisible, isInViewport]);

    const handleImageLoad = useCallback(() => {
      setIsLoading(false);
      setHasError(false);
      if (!loadedThumbnails[pageNumber]) {
        onThumbnailLoad(pageNumber);
      }
    }, [loadedThumbnails, pageNumber, onThumbnailLoad]);

    const handleImageError = useCallback(() => {
      loadAttempts.current += 1;
      if (loadAttempts.current < maxAttempts) {
        // Réessayer avec un délai croissant
        const delay = Math.min(1000 * Math.pow(2, loadAttempts.current - 1), 5000);
        setTimeout(() => {
          setImageUrl((prev) => {
            if (!prev) return null;
            // Utiliser & si l'URL contient déjà des query params
            const separator = prev.includes('?') ? '&' : '?';
            // Supprimer l'ancien retry param si présent
            const baseUrl = prev.replace(/[?&]retry=\d+/g, '');
            return `${baseUrl}${separator}retry=${loadAttempts.current}`;
          });
        }, delay);
      } else {
        console.error(
          `Échec du chargement de l'image pour la page ${pageNumber} après ${maxAttempts} tentatives`
        );
        setHasError(true);
        setIsLoading(false);
      }
    }, [pageNumber]);

    return (
      <button
        ref={internalRef}
        data-page={pageNumber}
        id={`thumbnail-${pageNumber}`}
        onClick={() => onPageChange(pageNumber)}
        className={cn(
          "relative flex-shrink-0 rounded-md overflow-hidden transition-all cursor-pointer snap-center",
          currentPage === pageNumber
            ? "h-48 w-36 ring-2 ring-primary z-10"
            : "h-40 w-28 opacity-80 hover:opacity-100 hover:scale-105",
          hasError && "bg-muted"
        )}
      >
        <ImageLoader isLoading={isLoading} />
        {imageUrl && !hasError && (
          <Image
            src={imageUrl}
            alt={`Miniature page ${pageNumber}`}
            className={cn(
              "object-contain transition-opacity duration-300",
              isLoading ? "opacity-0" : "opacity-100"
            )}
            fill
            sizes="100px"
            loading="lazy"
            quality={50}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        )}
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <span className="text-sm text-muted-foreground">Erreur</span>
          </div>
        )}
        <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-center">
          <span className="text-sm text-white font-medium">{pageNumber}</span>
        </div>
      </button>
    );
  }
);

Thumbnail.displayName = "Thumbnail";
