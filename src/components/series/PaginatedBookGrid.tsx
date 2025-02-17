"use client";

import { BookGrid } from "./BookGrid";
import { Pagination } from "@/components/ui/Pagination";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Loader2, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { KomgaBook } from "@/types/komga";

interface PaginatedBookGridProps {
  books: KomgaBook[];
  currentPage: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
}

export function PaginatedBookGrid({
  books,
  currentPage,
  totalPages,
  totalElements,
  pageSize,
}: PaginatedBookGridProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isChangingPage, setIsChangingPage] = useState(false);
  const [showOnlyUnread, setShowOnlyUnread] = useState(searchParams.get("unread") === "true");

  // Réinitialiser l'état de chargement quand les tomes changent
  useEffect(() => {
    setIsChangingPage(false);
  }, [books]);

  const handlePageChange = async (page: number) => {
    setIsChangingPage(true);
    // Créer un nouvel objet URLSearchParams pour manipuler les paramètres
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    if (showOnlyUnread) {
      params.set("unread", "true");
    }

    // Rediriger vers la nouvelle URL avec les paramètres mis à jour
    await router.push(`${pathname}?${params.toString()}`);
  };

  const handleUnreadFilter = async () => {
    setIsChangingPage(true);
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1"); // Retourner à la première page lors du changement de filtre

    if (!showOnlyUnread) {
      params.set("unread", "true");
    } else {
      params.delete("unread");
    }

    setShowOnlyUnread(!showOnlyUnread);
    await router.push(`${pathname}?${params.toString()}`);
  };

  const handleBookClick = (book: KomgaBook) => {
    router.push(`/books/${book.id}`);
  };

  // Calcul des indices de début et de fin pour l'affichage
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalElements);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <p className="text-sm text-muted-foreground flex-1 min-w-[200px]">
          {totalElements > 0 ? (
            <>
              Affichage des tomes <span className="font-medium">{startIndex}</span> à{" "}
              <span className="font-medium">{endIndex}</span> sur{" "}
              <span className="font-medium">{totalElements}</span>
            </>
          ) : (
            "Aucun tome trouvé"
          )}
        </p>
        <button
          onClick={handleUnreadFilter}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg hover:bg-accent hover:text-accent-foreground whitespace-nowrap ml-auto"
        >
          <Filter className="h-4 w-4" />
          {showOnlyUnread ? "Afficher tout" : "À lire"}
        </button>
      </div>

      <div className="relative">
        {/* Indicateur de chargement */}
        {isChangingPage && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background border shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Chargement...</span>
            </div>
          </div>
        )}

        {/* Grille avec animation de transition */}
        <div
          className={cn(
            "transition-opacity duration-200",
            isChangingPage ? "opacity-25" : "opacity-100"
          )}
        >
          <BookGrid books={books} onBookClick={handleBookClick} />
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <p className="text-sm text-muted-foreground order-2 sm:order-1">
          Page {currentPage} sur {totalPages}
        </p>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          className="order-1 sm:order-2"
        />
      </div>
    </div>
  );
}
