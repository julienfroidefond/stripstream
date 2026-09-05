"use client";

import { Library, RefreshCw } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { NormalizedLibrary } from "@/lib/providers/types";
import { useTranslate } from "@/hooks/useTranslate";
import { NavButton } from "@/components/ui/nav-button";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";
import { useSidebarNav } from "./SidebarNavContext";

export function SidebarLibrariesView({ libraries }: { libraries: NormalizedLibrary[] }) {
  const { t } = useTranslate();
  const pathname = usePathname();
  const router = useRouter();
  const handleLinkClick = useSidebarNav();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
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
  );
}
