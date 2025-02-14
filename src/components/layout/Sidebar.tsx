"use client";

import { BookOpen, Home, Library, Settings, LogOut, RefreshCw, Star } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { authService } from "@/lib/services/auth.service";
import { useEffect, useState, useCallback } from "react";
import { KomgaLibrary, KomgaSeries } from "@/types/komga";
import { storageService } from "@/lib/services/storage.service";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [libraries, setLibraries] = useState<KomgaLibrary[]>([]);
  const [favorites, setFavorites] = useState<KomgaSeries[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(true);

  const fetchLibraries = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/komga/libraries");
      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des bibliothèques");
      }
      const data = await response.json();
      setLibraries(data);
    } catch (error) {
      console.error("Erreur:", error);
      setLibraries([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const fetchFavorites = useCallback(async () => {
    setIsLoadingFavorites(true);
    try {
      // Récupérer les IDs des favoris depuis l'API
      const favoritesResponse = await fetch("/api/komga/favorites");
      if (!favoritesResponse.ok) {
        throw new Error("Erreur lors de la récupération des favoris");
      }
      const favoriteIds = await favoritesResponse.json();

      if (favoriteIds.length === 0) {
        setFavorites([]);
        return;
      }

      // Récupérer les détails des séries pour chaque ID
      const promises = favoriteIds.map(async (id: string) => {
        const response = await fetch(`/api/komga/series/${id}`);
        if (!response.ok) return null;
        return response.json();
      });

      const results = await Promise.all(promises);
      setFavorites(results.filter((series): series is KomgaSeries => series !== null));
    } catch (error) {
      console.error("Erreur lors de la récupération des favoris:", error);
      setFavorites([]);
    } finally {
      setIsLoadingFavorites(false);
    }
  }, []);

  // Chargement initial des données
  useEffect(() => {
    fetchLibraries();
    fetchFavorites();
  }, [fetchLibraries, fetchFavorites]);

  // Mettre à jour les favoris quand ils changent
  useEffect(() => {
    const handleFavoritesChange = () => {
      fetchFavorites();
    };

    window.addEventListener("favoritesChanged", handleFavoritesChange);

    return () => {
      window.removeEventListener("favoritesChanged", handleFavoritesChange);
    };
  }, [fetchFavorites]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchLibraries(), fetchFavorites()]);
  };

  const handleLogout = () => {
    authService.logout();
    storageService.clearAll();
    setLibraries([]);
    setFavorites([]);
    onClose();
    router.push("/login");
  };

  const handleLinkClick = () => {
    onClose();
  };

  const navigation = [
    {
      name: "Accueil",
      href: "/",
      icon: Home,
    },
  ];

  return (
    <aside
      className={cn(
        "fixed left-0 top-14 z-30 h-[calc(100vh-3.5rem)] w-64 border-r border-border/40",
        "bg-background/80 backdrop-blur-sm supports-[backdrop-filter]:bg-background/60",
        "transition-transform duration-300 ease-in-out flex flex-col",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
      id="sidebar"
    >
      <div className="flex-1 space-y-4 py-4 overflow-y-auto">
        <div className="px-3 py-2">
          <div className="space-y-1">
            <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">Navigation</h2>
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleLinkClick}
                className={cn(
                  "flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                  pathname === item.href ? "bg-accent" : "transparent"
                )}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="px-3 py-2">
          <div className="space-y-1">
            <div className="mb-2 px-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">Favoris</h2>
              <span className="text-xs text-muted-foreground">{favorites.length}</span>
            </div>
            {isLoadingFavorites ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">Chargement...</div>
            ) : favorites.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">Aucun favori</div>
            ) : (
              favorites.map((series) => (
                <Link
                  key={series.id}
                  href={`/series/${series.id}`}
                  onClick={handleLinkClick}
                  className={cn(
                    "flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                    pathname === `/series/${series.id}` ? "bg-accent" : "transparent"
                  )}
                >
                  <Star className="mr-2 h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="truncate">{series.metadata.title}</span>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="px-3 py-2">
          <div className="space-y-1">
            <div className="mb-2 px-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">Bibliothèques</h2>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-1 hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
                aria-label="Rafraîchir les bibliothèques"
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              </button>
            </div>
            {isLoading ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">Chargement...</div>
            ) : libraries.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">Aucune bibliothèque</div>
            ) : (
              libraries.map((library) => (
                <Link
                  key={library.id}
                  href={`/libraries/${library.id}`}
                  onClick={handleLinkClick}
                  className={cn(
                    "flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                    pathname === `/libraries/${library.id}` ? "bg-accent" : "transparent"
                  )}
                >
                  <Library className="mr-2 h-4 w-4" />
                  {library.name}
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="px-3 py-2">
          <div className="space-y-1">
            <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">Configuration</h2>
            <Link
              href="/settings"
              onClick={handleLinkClick}
              className={cn(
                "flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                pathname === "/settings" ? "bg-accent" : "transparent"
              )}
            >
              <Settings className="mr-2 h-4 w-4" />
              Préférences
            </Link>
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-border/40">
        <button
          onClick={handleLogout}
          className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}
