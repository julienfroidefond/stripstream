"use client";

import { Star } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import type { NormalizedSeries } from "@/lib/providers/types";
import { useTranslate } from "@/hooks/useTranslate";
import { NavButton } from "@/components/ui/nav-button";
import { useSidebarNav } from "./SidebarNavContext";

export function SidebarFavoritesView({ favorites }: { favorites: NormalizedSeries[] }) {
  const { t } = useTranslate();
  const pathname = usePathname();
  const router = useRouter();
  const handleLinkClick = useSidebarNav();

  // Rafraîchir les favoris quand un événement de changement est émis
  // (ajout/retrait depuis une page série). router.refresh() re-streame
  // ce slot serveur avec les nouvelles données.
  useEffect(() => {
    const handler = () => router.refresh();
    window.addEventListener("favoritesChanged", handler);
    return () => window.removeEventListener("favoritesChanged", handler);
  }, [router]);

  return (
    <div className="rounded-xl border border-border/50 bg-background/30 p-2">
      <div className="space-y-1">
        <div className="mb-2 flex items-center justify-between px-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {t("sidebar.favorites.title")}
          </h2>
          <span className="text-xs text-muted-foreground">{favorites.length}</span>
        </div>
        {favorites.length === 0 ? (
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
  );
}
