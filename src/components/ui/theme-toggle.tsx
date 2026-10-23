"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
}

/**
 * Bascule clair / sombre, partagée par l'en-tête de l'application et les
 * écrans publics. Le soleil et la lune se croisent en tournant : la bascule
 * reste lisible sans changer la largeur de la commande.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className={cn(
        "rounded-full p-2 transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      aria-label={t("header.toggleTheme")}
    >
      <span className="relative flex h-5 w-5 items-center">
        {/* En Tailwind 4, `rotate-*` pilote la propriété `rotate` (et non `transform`) : la transition doit donc la cibler. */}
        <Sun className="absolute inset-0 h-[1.2rem] w-[1.2rem] rotate-0 transition-[rotate,opacity] dark:-rotate-90 dark:opacity-0" />
        <Moon className="absolute inset-0 h-[1.2rem] w-[1.2rem] rotate-90 opacity-0 transition-[rotate,opacity] dark:rotate-0 dark:opacity-100" />
      </span>
    </button>
  );
}
