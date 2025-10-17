"use client";

import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ currentPage, totalPages, onPageChange, className }: PaginationProps) {
  // Ne pas afficher la pagination s'il n'y a qu'une seule page
  if (totalPages <= 1) return null;

  // Fonction pour générer la liste des pages à afficher
  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];

    if (totalPages <= 7) {
      // Si moins de 7 pages, afficher toutes les pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Toujours afficher la première page
      pages.push(1);

      if (currentPage > 3) {
        pages.push("...");
      }

      // Pages autour de la page courante
      for (
        let i = Math.max(2, currentPage - 1);
        i <= Math.min(totalPages - 1, currentPage + 1);
        i++
      ) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("...");
      }

      // Toujours afficher la dernière page
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className={cn("flex justify-center items-center gap-1", className)}
    >
      {/* Bouton précédent */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 gap-1 hover:bg-accent/80 hover:backdrop-blur-md hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
        aria-label="Page précédente"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only md:not-sr-only">Précédent</span>
      </button>

      {/* Liste des pages */}
      <div className="flex items-center gap-1">
        {getPageNumbers().map((page, index) => {
          if (page === "...") {
            return (
              <div key={`ellipsis-${index}`} className="flex items-center justify-center h-10 w-10">
                <MoreHorizontal className="h-4 w-4" />
              </div>
            );
          }

          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              disabled={page === currentPage}
              className={cn(
                "inline-flex items-center justify-center rounded-md text-sm font-medium h-10 w-10",
                page === currentPage
                  ? "bg-primary/90 backdrop-blur-md text-primary-foreground"
                  : "hover:bg-accent/80 hover:backdrop-blur-md hover:text-accent-foreground"
              )}
              aria-label={`Page ${page}`}
              aria-current={page === currentPage ? "page" : undefined}
            >
              {page}
            </button>
          );
        })}
      </div>

      {/* Bouton suivant */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 gap-1 hover:bg-accent/80 hover:backdrop-blur-md hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
        aria-label="Page suivante"
      >
        <span className="sr-only md:not-sr-only">Suivant</span>
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
