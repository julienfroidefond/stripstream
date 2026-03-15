import { Menu, Moon, Sun, RefreshCw, Search } from "lucide-react";
import { useTheme } from "next-themes";
import LanguageSelector from "@/components/LanguageSelector";
import { useTranslation } from "react-i18next";
import { IconButton } from "@/components/ui/icon-button";
import { useState } from "react";
import { GlobalSearch } from "@/components/layout/GlobalSearch";

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
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleRefreshBackground = async () => {
    if (onRefreshBackground && !isRefreshing) {
      setIsRefreshing(true);
      await onRefreshBackground();
      setIsRefreshing(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-primary/30 bg-background/70 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-background/65 pt-safe relative overflow-visible">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(112deg,hsl(var(--primary)/0.24)_0%,hsl(192_85%_55%/0.2)_30%,transparent_56%),linear-gradient(248deg,hsl(338_82%_62%/0.16)_0%,transparent_46%),repeating-linear-gradient(135deg,hsl(var(--foreground)/0.03)_0_1px,transparent_1px_11px)]" />
      <div className="container relative flex h-16 max-w-screen-2xl items-center">
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
              <span className="bg-gradient-to-r from-primary via-cyan-500 to-fuchsia-500 bg-clip-text text-base font-bold tracking-[0.06em] text-transparent sm:text-lg sm:tracking-[0.08em]">
                StripStream
              </span>
              <span className="mt-1 hidden text-[10px] font-medium uppercase tracking-[0.22em] text-foreground/70 sm:inline">
                comic reader
              </span>
            </span>
          </a>
        </div>

        <div className="hidden min-w-0 flex-1 px-1 sm:block sm:px-3">
          <GlobalSearch />
        </div>

        <div className="ml-auto flex items-center">
          <nav className="flex items-center gap-1 rounded-full border border-border/60 bg-background/45 px-1 py-1 shadow-[0_4px_18px_-14px_rgba(0,0,0,0.65)] backdrop-blur-md">
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
            <LanguageSelector />
            <button
              onClick={toggleTheme}
              className="rounded-full p-2 transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label={t("header.toggleTheme")}
            >
              <div className="relative flex h-5 w-5 items-center">
                <Sun className="absolute inset-0 h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute inset-0 h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </div>
              <span className="sr-only">{t("header.toggleTheme")}</span>
            </button>
          </nav>
        </div>
      </div>
      {isMobileSearchOpen && (
        <div className="border-t border-border/50 bg-background/90 px-3 pb-3 pt-2 backdrop-blur-xl sm:hidden">
          <GlobalSearch />
        </div>
      )}
    </header>
  );
}
