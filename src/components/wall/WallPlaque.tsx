"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowUpRight, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePresence } from "@/components/motion";
import { SplitText } from "@/lib/gsap";
import { useTranslate } from "@/hooks/useTranslate";
import { isWallItemComplete } from "@/lib/wall-filter";
import type { WallItem } from "@/types/wall";
import { cn } from "@/lib/utils";

export interface WallPlaqueAnchor {
  left: number;
  top: number;
  width: number;
  /** Côté de la couverture où se pose la plaque : la règle d'accent regarde l'œuvre. */
  side: "left" | "right";
}

export type WallPlaquePlacement =
  | { mode: "anchor"; anchor: WallPlaqueAnchor }
  | { mode: "sheet"; maxHeight?: number };

interface WallPlaqueProps {
  item: WallItem;
  placement: WallPlaquePlacement;
  /** Faux : la plaque joue sa sortie puis se retire. */
  open: boolean;
  onClose: () => void;
}

/**
 * Plaque d'œuvre : la fiche se pose à côté de la couverture, comme une
 * étiquette de musée. Sur mobile, elle devient une feuille ancrée en bas,
 * seule surface interactive du mur.
 *
 * Entrée en relief, comme le reste du site : la plaque pivote depuis la
 * couverture, charnière côté œuvre, comme un volet qu'on ouvre ; la feuille
 * mobile monte du bas avec un léger rebond. Puis les mots du titre basculent
 * en 3D, les lignes remontent et la jauge de lecture se remplit.
 */
export function WallPlaque({ item, placement, open, onClose }: WallPlaqueProps) {
  const { t } = useTranslate();
  const isSheet = placement.mode === "sheet";
  const panelRef = useRef<HTMLElement | null>(null);
  const hingeLeft = !isSheet && placement.anchor.side !== "left";

  // La feuille entre par le bas : un `autoFocus` classique sur un de ses
  // contrôles la ferait défiler hors de l'écran sur iOS, en emportant tout le
  // mur avec elle. On donne donc le focus au panneau lui-même, sans défilement ;
  // `Tab` atteint ensuite la croix de fermeture.
  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus({ preventScroll: true });
  }, [open]);

  const rendered = usePresence(open, panelRef, {
    enter: (timeline, panel, still) => {
      if (still) {
        timeline.fromTo(panel, { opacity: 0 }, { opacity: 1, duration: 0.15 });
        return;
      }
      timeline.fromTo(
        panel,
        isSheet
          ? { opacity: 0, yPercent: 100 }
          : {
              opacity: 0,
              rotateY: hingeLeft ? -78 : 78,
              transformPerspective: 900,
              transformOrigin: hingeLeft ? "0% 50%" : "100% 50%",
            },
        {
          opacity: 1,
          yPercent: 0,
          rotateY: 0,
          duration: isSheet ? 0.5 : 0.55,
          ease: isSheet ? "back.out(1.2)" : "back.out(1.4)",
        },
        0
      );

      const title = panel.querySelector<HTMLElement>("[data-plaque-title]");
      const split = title ? SplitText.create(title, { type: "words" }) : null;
      if (split) {
        timeline.fromTo(
          split.words,
          { opacity: 0, yPercent: 70, rotateX: -95, transformPerspective: 600, transformOrigin: "50% 100%" },
          { opacity: 1, yPercent: 0, rotateX: 0, duration: 0.5, ease: "back.out(2)", stagger: 0.04 },
          0.12
        );
        timeline.eventCallback("onComplete", () => split.revert());
      }
      timeline.fromTo(
        panel.querySelectorAll("[data-plaque-line]"),
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.05 },
        0.16
      );
      const fill = panel.querySelector<HTMLElement>("[data-plaque-fill]");
      if (fill) {
        timeline.fromTo(
          fill,
          { scaleX: 0, transformOrigin: "0% 50%" },
          { scaleX: 1, duration: 0.6 },
          0.35
        );
      }
    },
    exit: (timeline, panel, still) => {
      timeline.to(
        panel,
        still
          ? { opacity: 0, duration: 0.15 }
          : isSheet
            ? { opacity: 0, yPercent: 60, duration: 0.28, ease: "power2.in" }
            : { opacity: 0, rotateY: hingeLeft ? -50 : 50, duration: 0.24, ease: "power2.in" }
      );
    },
  });

  const progress =
    item.bookCount > 0 ? Math.min(1, Math.max(0, item.booksReadCount / item.bookCount)) : 0;
  const complete = isWallItemComplete(item);
  const started = item.booksReadCount > 0;
  const volumeLabel =
    item.bookCount > 1
      ? t("wall.volumes", { count: item.bookCount })
      : t("wall.volume", { count: item.bookCount });

  const content = (
    <div>
      <p data-plaque-line className="wall-plaque-kicker">
        <span className="wall-plaque-dot" aria-hidden />
        {item.libraryName}
        {item.startYear ? ` · ${item.startYear}` : ""}
      </p>

      <h2 data-plaque-title className="wall-plaque-title">
        {item.name}
      </h2>

      {item.authors.length > 0 && (
        <p data-plaque-line className="wall-plaque-authors">
          {item.authors.join(" · ")}
        </p>
      )}

      <p data-plaque-line className="wall-plaque-summary">
        {item.summary ?? t("wall.noSummary")}
      </p>

      {item.genres.length > 0 && (
        <div data-plaque-line className="wall-plaque-genres">
          {item.genres.map((genre) => (
            <span key={genre} className="wall-plaque-genre">
              {genre}
            </span>
          ))}
        </div>
      )}

      <div data-plaque-line className="wall-plaque-footer">
        <div className="min-w-0">
          <p className="wall-plaque-progress-label">
            {complete
              ? t("wall.completed")
              : started
                ? t("wall.progress", { read: item.booksReadCount, total: item.bookCount })
                : t("wall.unread")}
          </p>
          <div className="wall-plaque-progress-track" aria-hidden>
            <div
              data-plaque-fill
              className="wall-plaque-progress-fill"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>

        {isSheet ? (
          <Button asChild size="sm" className="shrink-0">
            <Link href={`/series/${item.id}`} onClick={onClose}>
              {t("wall.open")}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <Link
            href={`/series/${item.id}`}
            className="wall-plaque-open"
            onClick={onClose}
          >
            {t("wall.open")}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      <p className="wall-plaque-meta">{volumeLabel}</p>
    </div>
  );

  if (!rendered) return null;

  return (
    <div
      data-wall-ui
      className={cn("wall-plaque-shell", isSheet ? "wall-sheet-shell" : "wall-anchor-shell")}
      style={
        isSheet
          ? undefined
          : {
              left: placement.anchor.left,
              top: placement.anchor.top,
              width: placement.anchor.width,
            }
      }
    >
      {isSheet ? (
        <div
          ref={(node) => {
            panelRef.current = node;
          }}
          className="wall-sheet"
          role="dialog"
          aria-label={item.name}
          tabIndex={-1}
          style={placement.maxHeight ? { maxHeight: placement.maxHeight } : undefined}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="wall-sheet-handle" aria-hidden />
          <button
            type="button"
            className="wall-sheet-close"
            onClick={onClose}
            aria-label={t("wall.close")}
          >
            <X className="h-4 w-4" />
          </button>
          <div className="wall-sheet-body">{content}</div>
        </div>
      ) : (
        <article
          ref={(node) => {
            panelRef.current = node;
          }}
          className={cn("wall-plaque", placement.anchor.side === "left" && "wall-plaque-left")}
          role="dialog"
          aria-label={item.name}
          tabIndex={-1}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="wall-plaque-close"
            onClick={onClose}
            aria-label={t("wall.close")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <span className="wall-plaque-rule" aria-hidden />
          {content}
        </article>
      )}
    </div>
  );
}
