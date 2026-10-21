"use client";

import {
  Home,
  Bookmark,
  LayoutGrid,
  Settings,
  LogOut,
  User,
  Shield,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";
import { useCallback, Suspense } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useTranslate } from "@/hooks/useTranslate";
import { NavButton } from "@/components/ui/nav-button";
import { SidebarNavContext } from "@/components/layout/SidebarNavContext";
import logger from "@/lib/logger";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  userIsAdmin?: boolean;
  // Slots serveur streamés
  favoritesSlot?: React.ReactNode;
  librariesSlot?: React.ReactNode;
  connectionsSlot?: React.ReactNode;
  favoritesSkeleton?: React.ReactNode;
  librariesSkeleton?: React.ReactNode;
  connectionsSkeleton?: React.ReactNode;
}

export function Sidebar({
  isOpen,
  onClose,
  userIsAdmin = false,
  favoritesSlot,
  librariesSlot,
  connectionsSlot,
  favoritesSkeleton,
  librariesSkeleton,
  connectionsSkeleton,
}: SidebarProps) {
  const { t } = useTranslate();
  const pathname = usePathname();
  const router = useRouter();

  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: "/login" });
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

  return (
    <SidebarNavContext.Provider value={handleLinkClick}>
      <aside
        className={cn(
          "fixed left-0 top-[calc(4rem+env(safe-area-inset-top,0px))] z-30 h-[calc(100dvh-4rem-env(safe-area-inset-top,0px))] w-72 border-r border-border", // taste-skill-ignore: arête du rail latéral
          "bg-surface-1",
          "transition-transform duration-300 ease-standard flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        id="sidebar"
      >
        <div className="relative z-10 flex-1 space-y-4 overflow-y-auto px-3 py-4">
          <NavButton
            icon={Home}
            label={t("sidebar.home")}
            active={pathname === "/"}
            onClick={() => handleLinkClick("/")}
          />
          <NavButton
            icon={LayoutGrid}
            label={t("sidebar.wall")}
            active={pathname === "/wall"}
            onClick={() => handleLinkClick("/wall")}
          />
          <NavButton
            icon={Bookmark}
            label={t("sidebar.readingLists")}
            active={pathname === "/reading-lists" || pathname.startsWith("/reading-lists/")}
            onClick={() => handleLinkClick("/reading-lists")}
          />

          {/* Favoris — streamé */}
          <Suspense fallback={favoritesSkeleton}>{favoritesSlot}</Suspense>

          {/* Bibliothèques — streamé */}
          <Suspense fallback={librariesSkeleton}>{librariesSlot}</Suspense>

          {/* Connexions — streamé */}
          <Suspense fallback={connectionsSkeleton}>{connectionsSlot}</Suspense>

          <div className="rounded-xl bg-surface-2 p-2">
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

        <div className="relative bg-surface-2 p-3">
          <NavButton
            icon={LogOut}
            label={t("sidebar.logout")}
            onClick={handleLogout}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          />
        </div>
      </aside>
    </SidebarNavContext.Provider>
  );
}
