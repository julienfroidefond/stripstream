"use client";

import { Star } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { NormalizedSeries } from "@/lib/providers/types";
import { subscribeToFavoriteChanges } from "@/lib/series/favorite-events";
import { useTranslate } from "@/hooks/useTranslate";
import { NavButton } from "@/components/ui/nav-button";
import { useSidebarNav } from "./SidebarNavContext";

interface FavoriteOverridesState {
  /** Signature de la liste serveur sur laquelle portent les overrides. */
  base: string;
  values: Map<string, NormalizedSeries | null>;
}

export function SidebarFavoritesView({
  favorites,
}: {
  favorites: NormalizedSeries[];
}) {
  const { t } = useTranslate();
  const pathname = usePathname();
  const handleLinkClick = useSidebarNav();
  const favoriteIdsKey = useMemo(
    () => favorites.map((series) => series.id).sort().join("|"),
    [favorites]
  );
  const [overrides, setOverrides] = useState<FavoriteOverridesState>(() => ({
    base: favoriteIdsKey,
    values: new Map(),
  }));

  // La mutation est déjà optimiste dans la page ; la sidebar applique le même
  // delta localement. Le refresh unique est déclenché par le module de
  // mutation, pas par cet abonnement.
  useEffect(() => {
    return subscribeToFavoriteChanges((detail) => {
      if (detail.action === "add" && !detail.series) return;

      setOverrides((current) => {
        const values =
          current.base === favoriteIdsKey
            ? new Map(current.values)
            : new Map<string, NormalizedSeries | null>();
        values.set(
          detail.seriesId,
          detail.action === "add" ? (detail.series ?? null) : null
        );
        return { base: favoriteIdsKey, values };
      });
    });
  }, [favoriteIdsKey]);

  // Dès que la liste serveur change, elle reprend la main : les overrides ne
  // valent que pour la version de la liste qui les a vus naître.
  const items = useMemo(() => {
    if (overrides.base !== favoriteIdsKey || overrides.values.size === 0) {
      return favorites;
    }

    const byId = new Map(favorites.map((series) => [series.id, series]));
    for (const [seriesId, series] of overrides.values) {
      if (series) byId.set(seriesId, series);
      else byId.delete(seriesId);
    }
    return [...byId.values()];
  }, [favorites, favoriteIdsKey, overrides]);

  return (
    <div className="rounded-xl border border-border/50 bg-background/30 p-2">
      <div className="space-y-1">
        <div className="mb-2 flex items-center justify-between px-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {t("sidebar.favorites.title")}
          </h2>
          <span className="text-xs text-muted-foreground">{items.length}</span>
        </div>
        {items.length === 0 ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">
            {t("sidebar.favorites.empty")}
          </div>
        ) : (
          items.map((series) => (
            <NavButton
              key={series.id}
              icon={Star}
              label={series.name}
              active={pathname === `/series/${series.id}`}
              activeLayoutId="sidebar-favorites-active"
              onClick={() => handleLinkClick(`/series/${series.id}`)}
              className="[&_svg]:fill-yellow-400 [&_svg]:text-yellow-400"
            />
          ))
        )}
      </div>
    </div>
  );
}
