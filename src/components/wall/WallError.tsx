"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTranslate } from "@/hooks/useTranslate";
import { WallFrame } from "./WallFrame";

interface WallErrorProps {
  code: string;
  onRetry?: () => void;
}

/**
 * Le mur n'a pas pu être accroché. Le cadre reste debout : l'erreur occupe la
 * salle, avec une seule sortie utile — relancer l'accrochage.
 */
export function WallError({ code, onRetry }: WallErrorProps) {
  const { t } = useTranslate();
  const router = useRouter();

  return (
    <WallFrame>
      <div className="absolute inset-0 flex items-center justify-center px-6">
        <div className="wall-error-panel">
          <p className="wall-eyebrow">
            <span className="wall-eyebrow-rule" aria-hidden />
            {t("wall.eyebrow")}
          </p>
          <h1 className="wall-error-title">{t("wall.errorTitle")}</h1>
          <p className="wall-error-body" role="alert">
            {t(`errors.${code}`)}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button onClick={onRetry ?? (() => router.refresh())}>
              <RefreshCw className="h-4 w-4" />
              {t("common.retry")}
            </Button>
            <Button asChild variant="ghost">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                {t("wall.backHome")}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </WallFrame>
  );
}
