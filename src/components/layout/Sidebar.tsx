"use client";

import { Home, Library, Settings, LogOut, RefreshCw, Star, Download } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import type { KomgaLibrary, KomgaSeries } from "@/types/komga";
import { usePreferences } from "@/contexts/PreferencesContext";
import { AppError } from "@/utils/errors";
import { ERROR_CODES } from "@/constants/errorCodes";
import { getErrorMessage } from "@/utils/errors";
import { useToast } from "@/components/ui/use-toast";
import { useTranslate } from "@/hooks/useTranslate";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  initialLibraries: KomgaLibrary[];
  initialFavorites: KomgaSeries[];
}

export function Sidebar({ isOpen, onClose, initialLibraries, initialFavorites }: SidebarProps) {
  const { t } = useTranslate();
  const pathname = usePathname();
  const router = useRouter();
  const { preferences } = usePreferences();
  const [libraries, setLibraries] = useState<KomgaLibrary[]>(initialLibraries || []);
  const [favorites, setFavorites] = useState<KomgaSeries[]>(initialFavorites || []);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { toast } = useToast();

  const refreshLibraries = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/komga/libraries");
      if (!response.ok) {
        throw new AppError(ERROR_CODES.LIBRARY.FETCH_ERROR);
      }
      const data = await response.json();
      setLibraries(data);
    } catch (error) {
      console.error("Erreur de chargement des bibliothèques:", error);
      toast({
        title: "Erreur",
        description:
          error instanceof AppError
            ? error.message
            : getErrorMessage(ERROR_CODES.LIBRARY.FETCH_ERROR),
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [toast]);

  const refreshFavorites = useCallback(async () => {
    try {
      const favoritesResponse = await fetch("/api/komga/favorites");
      if (!favoritesResponse.ok) {
        throw new AppError(ERROR_CODES.FAVORITE.FETCH_ERROR);
      }
      const favoriteIds = await favoritesResponse.json();

      if (favoriteIds.length === 0) {
        setFavorites([]);
        return;
      }

      const promises = favoriteIds.map(async (id: string) => {
        const response = await fetch(`/api/komga/series/${id}`);
        if (!response.ok) {
          throw new AppError(ERROR_CODES.SERIES.FETCH_ERROR);
        }
        return response.json();
      });

      const results = await Promise.all(promises);
      setFavorites(results.filter((series): series is KomgaSeries => series !== null));
    } catch (error) {
      console.error("Erreur de chargement des favoris:", error);
      toast({
        title: "Erreur",
        description:
          error instanceof AppError
            ? error.message
            : getErrorMessage(ERROR_CODES.FAVORITE.FETCH_ERROR),
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    if (Object.keys(preferences).length > 0) {
      refreshLibraries();
      refreshFavorites();
    }
  }, [preferences, refreshLibraries, refreshFavorites]);

  // Mettre à jour les favoris quand ils changent
  useEffect(() => {
    const handleFavoritesChange = () => {
      refreshFavorites();
    };

    window.addEventListener("favoritesChanged", handleFavoritesChange);

    return () => {
      window.removeEventListener("favoritesChanged", handleFavoritesChange);
    };
  }, [refreshFavorites]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refreshLibraries(), refreshFavorites()]);
  };

  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: "/login" });
      setLibraries([]);
      setFavorites([]);
      onClose();
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la déconnexion",
        variant: "destructive",
      });
    }
  };

  const handleLinkClick = useCallback(
    async (path: string) => {
      if (pathname === path) {
        onClose();
        return;
      }
      window.dispatchEvent(new Event("navigationStart"));
      router.push(path);
      onClose();
      // On attend que la page soit chargée
      await new Promise((resolve) => setTimeout(resolve, 300));
      window.dispatchEvent(new Event("navigationComplete"));
    },
    [pathname, router, onClose]
  );

  const mainNavItems = [
    {
      title: t("sidebar.home"),
      href: "/",
      icon: Home,
    },
    {
      title: t("sidebar.downloads"),
      href: "/downloads",
      icon: Download,
    },
  ];

  return (
    <aside
      suppressHydrationWarning
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
            <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
              {t("sidebar.navigation")}
            </h2>
            {mainNavItems.map((item) => (
              <button
                key={item.href}
                onClick={() => handleLinkClick(item.href)}
                className={cn(
                  "w-full flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                  pathname === item.href ? "bg-accent" : "transparent"
                )}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.title}
              </button>
            ))}
          </div>
        </div>

        <div className="px-3 py-2">
          <div className="space-y-1">
            <div className="mb-2 px-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">
                {t("sidebar.favorites.title")}
              </h2>
              <span className="text-xs text-muted-foreground">{favorites.length}</span>
            </div>
            {isRefreshing ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                {t("sidebar.favorites.loading")}
              </div>
            ) : favorites.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                {t("sidebar.favorites.empty")}
              </div>
            ) : (
              favorites.map((series) => (
                <button
                  key={series.id}
                  onClick={() => handleLinkClick(`/series/${series.id}`)}
                  className={cn(
                    "w-full flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                    pathname === `/series/${series.id}` ? "bg-accent" : "transparent"
                  )}
                >
                  <Star className="mr-2 h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="truncate">{series.metadata.title}</span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="px-3 py-2">
          <div className="space-y-1">
            <div className="mb-2 px-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">
                {t("sidebar.libraries.title")}
              </h2>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-1 hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
                aria-label={t("sidebar.libraries.refresh")}
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              </button>
            </div>
            {isRefreshing ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                {t("sidebar.libraries.loading")}
              </div>
            ) : libraries.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                {t("sidebar.libraries.empty")}
              </div>
            ) : (
              libraries.map((library) => (
                <button
                  key={library.id}
                  onClick={() => handleLinkClick(`/libraries/${library.id}`)}
                  className={cn(
                    "w-full flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                    pathname === `/libraries/${library.id}` ? "bg-accent" : "transparent"
                  )}
                >
                  <Library className="mr-2 h-4 w-4" />
                  {library.name}
                </button>
              ))
            )}
          </div>
        </div>

        <div className="px-3 py-2">
          <div className="space-y-1">
            <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
              {t("sidebar.settings.title")}
            </h2>
            <button
              onClick={() => handleLinkClick("/settings")}
              className={cn(
                "w-full flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                pathname === "/settings" ? "bg-accent" : "transparent"
              )}
            >
              <Settings className="mr-2 h-4 w-4" />
              {t("sidebar.settings.preferences")}
            </button>
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-border/40">
        <button
          onClick={handleLogout}
          className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {t("sidebar.logout")}
        </button>
      </div>
    </aside>
  );
}
