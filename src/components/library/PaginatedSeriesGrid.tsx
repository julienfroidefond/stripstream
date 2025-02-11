"use client";

import { SeriesGrid } from "./SeriesGrid";
import { Pagination } from "@/components/ui/Pagination";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Loader2, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginatedSeriesGridProps {
  series: any[];
  serverUrl: string;
  currentPage: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
}

export function PaginatedSeriesGrid({
  series,
  serverUrl,
  currentPage,
  totalPages,
  totalElements,
  pageSize,
}: PaginatedSeriesGridProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isChangingPage, setIsChangingPage] = useState(false);
  const [showOnlyUnread, setShowOnlyUnread] = useState(searchParams.get("unread") === "true");

  // Réinitialiser l'état de chargement quand les séries changent
  useEffect(() => {
    setIsChangingPage(false);
  }, [series]);

  const handlePageChange = (page: number) => {
    setIsChangingPage(true);
    // Créer un nouvel objet URLSearchParams pour manipuler les paramètres
    const params = new URLSearchParams(searchParams);
    params.set("page", page.toString());
    if (showOnlyUnread) {
      params.set("unread", "true");
    }

    // Rediriger vers la nouvelle URL avec les paramètres mis à jour
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleUnreadFilter = () => {
    setIsChangingPage(true);
    const params = new URLSearchParams(searchParams);
    params.set("page", "1"); // Retourner à la première page lors du changement de filtre

    if (!showOnlyUnread) {
      params.set("unread", "true");
    } else {
      params.delete("unread");
    }

    setShowOnlyUnread(!showOnlyUnread);
    router.push(`${pathname}?${params.toString()}`);
  };

  // Calcul des indices de début et de fin pour l'affichage
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalElements);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {totalElements > 0 ? (
            <>
              Affichage des séries <span className="font-medium">{startIndex}</span> à{" "}
              <span className="font-medium">{endIndex}</span> sur{" "}
              <span className="font-medium">{totalElements}</span>
            </>
          ) : (
            "Aucune série trouvée"
          )}
        </p>
        <button
          onClick={handleUnreadFilter}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg hover:bg-accent hover:text-accent-foreground"
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
          <SeriesGrid series={series} serverUrl={serverUrl} />
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
