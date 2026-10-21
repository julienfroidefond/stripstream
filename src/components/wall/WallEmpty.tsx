"use client";

import Link from "next/link";
import { ArrowRight, Frame } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTranslate } from "@/hooks/useTranslate";
import { WallFrame } from "./WallFrame";

/**
 * Mur vide : aucune œuvre à accrocher. On garde le cadre et la lumière de la
 * salle plutôt qu'une page d'erreur — il manque juste les tableaux.
 */
export function WallEmpty() {
  const { t } = useTranslate();

  return (
    <WallFrame>
      <div className="wall-empty absolute inset-0 flex items-center justify-center px-6">
        <div className="relative w-full max-w-xl text-center">
          <div className="wall-empty-stack" aria-hidden>
            <span />
            <span />
            <span />
          </div>

          <p className="wall-eyebrow justify-center">
            <span className="wall-eyebrow-rule" aria-hidden />
            {t("wall.eyebrow")}
          </p>
          <h1 className="wall-empty-title">{t("wall.emptyTitle")}</h1>
          <p className="wall-empty-body">{t("wall.emptyBody")}</p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Button asChild>
              <Link href="/settings">
                {t("wall.connect")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/">{t("wall.backHome")}</Link>
            </Button>
          </div>

          <p className="wall-empty-footnote">
            <Frame className="h-3.5 w-3.5" aria-hidden />
            {t("wall.emptyFootnote")}
          </p>
        </div>
      </div>
    </WallFrame>
  );
}
