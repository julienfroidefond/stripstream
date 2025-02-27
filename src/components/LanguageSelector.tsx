"use client";

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Languages } from "lucide-react";

export default function LanguageSelector() {
  const { t, i18n } = useTranslation("common");

  const handleLanguageChange = (newLocale: string) => {
    i18n.changeLanguage(newLocale);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={t("language.select")}>
          <Languages className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleLanguageChange("fr")}
          className={i18n.language === "fr" ? "bg-accent" : ""}
        >
          {t("language.fr")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleLanguageChange("en")}
          className={i18n.language === "en" ? "bg-accent" : ""}
        >
          {t("language.en")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
