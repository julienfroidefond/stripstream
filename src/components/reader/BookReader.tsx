"use client";

import { KomgaBook } from "@/types/komga";
import { ChevronLeft, ChevronRight, ImageOff, Loader2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useState, useCallback } from "react";

interface BookReaderProps {
  book: KomgaBook;
  pages: number[];
  onClose?: () => void;
}

export function BookReader({ book, pages, onClose }: BookReaderProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const handlePreviousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      setIsLoading(true);
      setImageError(false);
    }
  }, [currentPage]);

  const handleNextPage = useCallback(() => {
    if (currentPage < pages.length) {
      setCurrentPage(currentPage + 1);
      setIsLoading(true);
      setImageError(false);
    }
  }, [currentPage, pages.length]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        handlePreviousPage();
      } else if (event.key === "ArrowRight") {
        handleNextPage();
      } else if (event.key === "Escape" && onClose) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePreviousPage, handleNextPage, onClose]);

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50">
      <div className="relative h-full flex items-center justify-center">
        {/* Bouton précédent */}
        {currentPage > 1 && (
          <button
            onClick={handlePreviousPage}
            className="absolute left-4 p-2 rounded-full bg-background/50 hover:bg-background/80 transition-colors"
            aria-label="Page précédente"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
        )}

        {/* Page courante */}
        <div className="relative h-full max-h-full w-auto max-w-full p-4">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
          {!imageError ? (
            <Image
              src={`/api/komga/books/${book.id}/pages/${currentPage}`}
              alt={`Page ${currentPage}`}
              className="h-full w-auto object-contain"
              width={800}
              height={1200}
              priority
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setImageError(true);
              }}
            />
          ) : (
            <div className="h-full w-96 flex items-center justify-center bg-muted rounded-lg">
              <ImageOff className="h-12 w-12" />
            </div>
          )}
        </div>

        {/* Bouton suivant */}
        {currentPage < pages.length && (
          <button
            onClick={handleNextPage}
            className="absolute right-4 p-2 rounded-full bg-background/50 hover:bg-background/80 transition-colors"
            aria-label="Page suivante"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        )}

        {/* Indicateur de page */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-background/50 text-sm">
          Page {currentPage} / {pages.length}
        </div>

        {/* Bouton fermer */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-background/50 hover:bg-background/80 transition-colors"
            aria-label="Fermer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
