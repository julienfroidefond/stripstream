"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { ArrowUpRight, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EASE_PROJECTION } from "@/lib/motion";
import { useTranslate } from "@/hooks/useTranslate";
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
  reduce: boolean;
  onClose: () => void;
}

const lineVariants: Variants = {
  hidden: { opacity: 0, y: 16, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transitionEnd: { filter: "none" },
    transition: { duration: 0.48, ease: EASE_PROJECTION },
  },
};

const bodyVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.055, delayChildren: 0.08 } },
};

/**
 * Plaque d'œuvre : la fiche se pose à côté de la couverture, comme une
 * étiquette de musée. Sur mobile, elle devient une feuille ancrée en bas,
 * seule surface interactive du mur.
 */
export function WallPlaque({
  item,
  placement,
  reduce,
  onClose,
}: WallPlaqueProps) {
  const { t } = useTranslate();
  const isSheet = placement.mode === "sheet";
  const progress =
    item.bookCount > 0 ? Math.min(1, Math.max(0, item.booksReadCount / item.bookCount)) : 0;
  const complete = item.bookCount > 0 && item.booksReadCount >= item.bookCount;
  const started = item.booksReadCount > 0;
  const volumeLabel =
    item.bookCount > 1
      ? t("wall.volumes", { count: item.bookCount })
      : t("wall.volume", { count: item.bookCount });

  const content = (
    <motion.div variants={bodyVariants} initial={reduce ? false : "hidden"} animate="visible">
      <motion.p variants={lineVariants} className="wall-plaque-kicker">
        <span className="wall-plaque-dot" aria-hidden />
        {item.libraryName}
        {item.startYear ? ` · ${item.startYear}` : ""}
      </motion.p>

      <motion.h2 variants={lineVariants} className="wall-plaque-title">
        {item.name}
      </motion.h2>

      {item.authors.length > 0 && (
        <motion.p variants={lineVariants} className="wall-plaque-authors">
          {item.authors.join(" · ")}
        </motion.p>
      )}

      <motion.p variants={lineVariants} className="wall-plaque-summary">
        {item.summary ?? t("wall.noSummary")}
      </motion.p>

      {item.genres.length > 0 && (
        <motion.div variants={lineVariants} className="wall-plaque-genres">
          {item.genres.map((genre) => (
            <span key={genre} className="wall-plaque-genre">
              {genre}
            </span>
          ))}
        </motion.div>
      )}

      <motion.div variants={lineVariants} className="wall-plaque-footer">
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
      </motion.div>

      <p className="wall-plaque-meta">{volumeLabel}</p>
    </motion.div>
  );

  return (
    <motion.div
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
        <motion.div
          className="wall-sheet"
          role="dialog"
          aria-label={item.name}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40, filter: "blur(10px)" }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 24, filter: "blur(6px)" }}
          transition={{ duration: reduce ? 0 : 0.5, ease: EASE_PROJECTION }}
          style={placement.maxHeight ? { maxHeight: placement.maxHeight } : undefined}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="wall-sheet-handle" aria-hidden />
          <button
            type="button"
            className="wall-sheet-close"
            onClick={onClose}
            aria-label={t("wall.close")}
            autoFocus
          >
            <X className="h-4 w-4" />
          </button>
          <div className="wall-sheet-body">{content}</div>
        </motion.div>
      ) : (
        <motion.article
          className={cn("wall-plaque", placement.anchor.side === "left" && "wall-plaque-left")}
          role="dialog"
          aria-label={item.name}
          initial={
            reduce
              ? { opacity: 0 }
              : {
                  opacity: 0,
                  x: placement.anchor.side === "right" ? -18 : 18,
                  scale: 0.975,
                  filter: "blur(10px)",
                }
          }
          animate={
            reduce ? { opacity: 1 } : { opacity: 1, x: 0, scale: 1, filter: "blur(0px)" }
          }
          exit={
            reduce
              ? { opacity: 0 }
              : {
                  opacity: 0,
                  x: placement.anchor.side === "right" ? -10 : 10,
                  scale: 0.985,
                  filter: "blur(6px)",
                }
          }
          transition={{ duration: reduce ? 0 : 0.42, ease: EASE_PROJECTION }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="wall-plaque-close"
            onClick={onClose}
            aria-label={t("wall.close")}
            autoFocus
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <span className="wall-plaque-rule" aria-hidden />
          {content}
        </motion.article>
      )}
    </motion.div>
  );
}
