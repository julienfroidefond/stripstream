import { Menu, Moon, Sun, RefreshCw } from "lucide-react";
import { useTheme } from "next-themes";
import LanguageSelector from "@/components/LanguageSelector";
import { useTranslation } from "react-i18next";
import { IconButton } from "@/components/ui/icon-button";
import { useState } from "react";

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
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/70 backdrop-blur-md supports-[backdrop-filter]:bg-background/50 pt-safe">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <IconButton
          variant="ghost"
          size="icon"
          icon={Menu}
          onClick={onToggleSidebar}
          tooltip={t("header.toggleSidebar")}
          className="mr-2"
          id="sidebar-toggle"
        />

        <div className="mr-4 hidden md:flex">
          <a className="mr-6 flex items-center space-x-2" href="/">
            <span className="hidden font-bold sm:inline-block">StripStream</span>
          </a>
        </div>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <nav className="flex items-center space-x-2">
            {showRefreshBackground && (
              <button
                onClick={handleRefreshBackground}
                disabled={isRefreshing}
                className="px-2 py-1.5 hover:bg-accent hover:text-accent-foreground rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Rafraîchir l'image de fond"
              >
                <RefreshCw
                  className={`h-[1.2rem] w-[1.2rem] ${isRefreshing ? "animate-spin" : ""}`}
                />
                <span className="sr-only">Rafraîchir l&apos;image de fond</span>
              </button>
            )}
            <LanguageSelector />
            <button
              onClick={toggleTheme}
              className="px-2 py-1.5 hover:bg-accent hover:text-accent-foreground rounded-md"
              aria-label={t("header.toggleTheme")}
            >
              <div className="relative flex items-center  w-5 h-5">
                <Sun className="absolute inset-0 h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute inset-0 h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </div>
              <span className="sr-only">{t("header.toggleTheme")}</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
