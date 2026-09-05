"use client";

import {
  Home,
  Library,
  Settings,
  LogOut,
  RefreshCw,
  Star,
  Download,
  User,
  Shield,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";
import { useEffect, useState, useCallback, useMemo } from "react";
import type { NormalizedLibrary, NormalizedSeries } from "@/lib/providers/types";
import type { KomgaConfigSummary } from "@/app/actions/config";
import type { StripstreamConfigSummary } from "@/app/actions/stripstream-config";
import { useToast } from "@/components/ui/use-toast";
import { useTranslate } from "@/hooks/useTranslate";
import { NavButton } from "@/components/ui/nav-button";
import { IconButton } from "@/components/ui/icon-button";
import { ProviderSwitcher } from "@/components/layout/ProviderSwitcher";
import logger from "@/lib/logger";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  initialLibraries: NormalizedLibrary[];
  initialFavorites: NormalizedSeries[];
  userIsAdmin?: boolean;
  komgaConfigs?: KomgaConfigSummary[];
  stripstreamConfigs?: StripstreamConfigSummary[];
}

export function Sidebar({
  isOpen,
  onClose,
  initialLibraries,
  initialFavorites,
  userIsAdmin = false,
  komgaConfigs = [],
  stripstreamConfigs = [],
}: SidebarProps) {
  const { t } = useTranslate();
  const pathname = usePathname();
  const router = useRouter();
  const [libraries, setLibraries] = useState<NormalizedLibrary[]>(initialLibraries || []);
  const [favorites, setFavorites] = useState<NormalizedSeries[]>(initialFavorites || []);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { toast } = useToast();

  // Mettre à jour les favoris quand ils changent (mise à jour optimiste)
  useEffect(() => {
    const handleFavoritesChange = (event: Event) => {
      const customEvent = event as CustomEvent<{
        seriesId?: string;
        action?: "add" | "remove";
        series?: NormalizedSeries;
      }>;

      // Si on a les détails de l'action, faire une mise à jour optimiste locale
      if (customEvent.detail?.seriesId) {
        const { seriesId, action, series } = customEvent.detail;

        if (action === "add" && series) {
          setFavorites((prev) => {
            if (prev.some((s) => s.id === series.id)) {
              return prev;
            }

            return [...prev, series];
          });
        } else if (action === "remove") {
          setFavorites((prev) => prev.filter((s) => s.id !== seriesId));
        } else {
          router.refresh();
        }
      } else {
        router.refresh();
      }
    };

    window.addEventListener("favoritesChanged", handleFavoritesChange);

    return () => {
      window.removeEventListener("favoritesChanged", handleFavoritesChange);
    };
  }, [router]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Revalider côté serveur via router.refresh()
    router.refresh();
    // Petit délai pour laisser le temps au serveur
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: "/login" });
      setLibraries([]);
      setFavorites([]);
      onClose();
    } catch (error) {
      logger.error({ err: error }, "Erreur lors de la déconnexion:");
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

  const mainNavItems = useMemo(
    () => [
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
    ],
    [t]
  );

  return (
    <aside
      
      className={cn(
        "fixed left-0 top-[calc(4rem+env(safe-area-inset-top,0px))] z-30 h-[calc(100vh-4rem-env(safe-area-inset-top,0px))] w-72 border-r border-primary/30",
        "bg-background/70 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-background/65",
        "transition-transform duration-300 ease-in-out flex flex-col",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
      id="sidebar"
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,hsl(var(--primary)/0.12)_0%,hsl(192_85%_55%/0.08)_32%,transparent_58%),linear-gradient(332deg,hsl(338_82%_62%/0.06)_0%,transparent_42%),repeating-linear-gradient(135deg,hsl(var(--foreground)/0.02)_0_1px,transparent_1px_11px)]" />
      <div className="pointer-events-none absolute inset-0 z-0">
        <div
          className="hidden h-full w-full bg-center bg-no-repeat opacity-[0.1] [background-size:260%] dark:block"
          style={{ backgroundImage: "url('/images/logostripstream.png')" }}
        />
        <div
          className="h-full w-full bg-center bg-no-repeat opacity-[0.12] [background-size:260%] dark:hidden"
          style={{ backgroundImage: "url('/images/logostripstream-white.png')" }}
        />
      </div>

      <div className="relative z-10 flex-1 space-y-4 overflow-y-auto px-3 py-4">
        <div className="rounded-xl border border-border/50 bg-background/30 p-2">
          <div className="space-y-1">
            <h2 className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {t("sidebar.navigation")}
            </h2>
            {mainNavItems.map((item) => (
              <NavButton
                key={item.href}
                icon={item.icon}
                label={item.title}
                active={pathname === item.href}
                onClick={() => handleLinkClick(item.href)}
              />
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border/50 bg-background/30 p-2">
          <div className="space-y-1">
            <div className="mb-2 flex items-center justify-between px-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
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
                <NavButton
                  key={series.id}
                  icon={Star}
                  label={series.name}
                  active={pathname === `/series/${series.id}`}
                  onClick={() => handleLinkClick(`/series/${series.id}`)}
                  className="[&_svg]:fill-yellow-400 [&_svg]:text-yellow-400"
                />
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border/50 bg-background/30 p-2">
          <div className="space-y-1">
            <div className="mb-2 flex items-center justify-between px-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {t("sidebar.libraries.title")}
              </h2>
              <IconButton
                variant="ghost"
                size="icon"
                icon={RefreshCw}
                onClick={handleRefresh}
                disabled={isRefreshing}
                tooltip={t("sidebar.libraries.refresh")}
                iconClassName={cn(isRefreshing && "animate-spin")}
                className="h-8 w-8"
              />
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
                <NavButton
                  key={library.id}
                  icon={Library}
                  label={library.name}
                  active={pathname === `/libraries/${library.id}`}
                  onClick={() => handleLinkClick(`/libraries/${library.id}`)}
                />
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border/50 bg-background/30 p-2">
          <h2 className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {t("sidebar.connection")}
          </h2>
          <div className="px-1">
            <ProviderSwitcher
              komgaConfigs={komgaConfigs}
              stripstreamConfigs={stripstreamConfigs}
            />
          </div>
        </div>

        <div className="rounded-xl border border-border/50 bg-background/30 p-2">
          <div className="space-y-1">
            <h2 className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {t("sidebar.settings.title")}
            </h2>
            <NavButton
              icon={User}
              label={t("sidebar.account")}
              active={pathname === "/account"}
              onClick={() => handleLinkClick("/account")}
            />
            <NavButton
              icon={Settings}
              label={t("sidebar.settings.preferences")}
              active={pathname === "/settings"}
              onClick={() => handleLinkClick("/settings")}
            />
            {userIsAdmin && (
              <NavButton
                icon={Shield}
                label={t("sidebar.admin")}
                active={pathname === "/admin"}
                onClick={() => handleLinkClick("/admin")}
              />
            )}
          </div>
        </div>
      </div>

      <div className="relative border-t border-border/50 bg-background/30 p-3">
        <NavButton
          icon={LogOut}
          label={t("sidebar.logout")}
          onClick={handleLogout}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        />
      </div>
    </aside>
  );
}
