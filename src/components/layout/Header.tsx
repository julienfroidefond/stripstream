import { Menu, RefreshCw, Search, EyeOff, Eye } from "lucide-react";
import LanguageSelector from "@/components/LanguageSelector";
import { useTranslation } from "react-i18next";
import { IconButton } from "@/components/ui/icon-button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useEffect, useState } from "react";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { useAnonymous } from "@/contexts/AnonymousContext";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onToggleSidebar: () => void;
  onRefreshBackground?: () => Promise<void>;
  showRefreshBackground?: boolean;
}

export function Header({
  onToggleSidebar,
  onRefreshBackground,
  showRefreshBackground = false,
}: HeaderProps) {
  const { t } = useTranslation();
  const { isAnonymous, toggleAnonymous } = useAnonymous();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isCondensed, setIsCondensed] = useState(false);
  // La barre se resserre dès que la page défile : elle rend de la place au contenu.
  useEffect(() => {
    const update = () => setIsCondensed(window.scrollY > 12);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  const handleRefreshBackground = async () => {
    if (onRefreshBackground && !isRefreshing) {
      setIsRefreshing(true);
      await onRefreshBackground();
      setIsRefreshing(false);
    }
  };

  return (
    <header className={cn("sticky top-0 z-50 w-full border-b border-border bg-background/80 glass pt-safe transition-[background-color,border-color] duration-300 ease-out supports-backdrop-filter:bg-background/65", isCondensed && "border-border/70 bg-background/95")}>{/* taste-skill-ignore: arête de la barre d'en-tête collante */}
      <div className="container relative flex h-16 max-w-(--breakpoint-2xl) items-center">{/* taste-skill-ignore: hauteur de barre constante, aucun décalage au défilement */}
        <IconButton
          variant="ghost"
          size="icon"
          icon={Menu}
          onClick={onToggleSidebar}
          tooltip={t("header.toggleSidebar")}
          className="mr-2 h-10 w-10 rounded-full"
          id="sidebar-toggle"
        />

        <div className="mr-2 flex items-center md:mr-4">
          <a className="mr-2 flex items-center md:mr-6" href="/">
            <span className="inline-flex flex-col leading-none">
              <span className="font-display text-base font-bold tracking-[0.06em] text-foreground sm:text-lg sm:tracking-[0.08em]">
                Strip<span className="text-primary">Stream</span>
              </span>
              <span className="mt-1 hidden text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground sm:inline">
                comic reader
              </span>
            </span>
          </a>
        </div>

        <div className="hidden min-w-0 flex-1 px-1 sm:block sm:px-3">
          <GlobalSearch />
        </div>

        <div className="ml-auto flex items-center">
          <nav className="flex items-center gap-1">
            {showRefreshBackground && (
              <IconButton
                onClick={handleRefreshBackground}
                disabled={isRefreshing}
                variant="ghost"
                size="icon"
                icon={RefreshCw}
                iconClassName={isRefreshing ? "animate-spin" : ""}
                className="h-9 w-9 rounded-full"
                tooltip="Rafraîchir l'image de fond"
              />
            )}
            <IconButton
              onClick={() => setIsMobileSearchOpen((value) => !value)}
              variant="ghost"
              size="icon"
              icon={Search}
              className="h-9 w-9 rounded-full sm:hidden"
              tooltip={t("header.search.placeholder")}
            />
            <IconButton
              data-testid="anonymous-mode-toggle"
              onClick={() => void toggleAnonymous()}
              variant="ghost"
              size="icon"
              icon={isAnonymous ? EyeOff : Eye}
              className={`h-9 w-9 rounded-full ${isAnonymous ? "text-primary" : ""}`}
              tooltip={t(isAnonymous ? "header.anonymousModeOn" : "header.anonymousModeOff")}
            />
            <LanguageSelector />
            <ThemeToggle />
          </nav>
        </div>
      </div>
      {isMobileSearchOpen && (
        <div className="border-t border-border bg-background px-3 pb-3 pt-2 sm:hidden">{/* taste-skill-ignore: arête du panneau de recherche mobile */}
          <GlobalSearch />
        </div>
      )}
    </header>
  );
}
