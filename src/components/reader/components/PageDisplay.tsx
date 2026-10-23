"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { RotateCw } from "lucide-react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";
import type { FitMode } from "../hooks/useFitMode";
import { planTurn, type PageRect, type ReaderSnapshot, type TurnPlan } from "../hooks/pageTurn";
import { PageTurnOverlay } from "./PageTurnOverlay";

/** Une page seule se tourne vite ; une double page, plus large, prend son temps. */
const TURN_DURATION_SINGLE = 650;
const TURN_DURATION_SPREAD = 850;

function measure(image: HTMLImageElement | null): PageRect | null {
  if (!image || image.naturalWidth === 0) return null;
  const { left, top, width, height } = image.getBoundingClientRect();
  return { left, top, width, height };
}

interface PageDisplayProps {
  currentPage: number;
  pages: number[];
  isDoublePage: boolean;
  shouldShowDoublePage: (page: number) => boolean;
  imageBlobUrls: Record<number, string>;
  imageErrors: Record<number | string, boolean>;
  onRetryImage: (pageNum: number) => void;
  isRTL: boolean;
  fitMode: FitMode;
  /** Préférence utilisateur : animer le tourné de page. */
  pageTurn: boolean;
  /** Compteur de tentatives de reculer depuis la première page. */
  startBump: number;
}

function ErrorPlaceholder({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-40"
      >
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
      </svg>
      <span className="text-sm opacity-60">Image non disponible</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRetry();
        }}
        className="flex items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs transition-colors hover:bg-surface-3"
      >
        <RotateCw className="h-3.5 w-3.5" />
        Réessayer
      </button>
    </div>
  );
}

function imageClassNameFor(fitMode: FitMode, isLoading: boolean) {
  return cn(
    // Chaque page montée se pose : invisible sous un tourné, lisible après un saut.
    "cursor-pointer transition-opacity motion-safe:animate-page-in",
    fitMode === "fit" && "max-h-full max-w-full object-contain",
    fitMode === "width" && "w-full h-auto max-w-full",
    fitMode === "height" && "h-[calc(100dvh-2.5rem)] w-auto max-h-[calc(100dvh-2.5rem)]",
    fitMode === "original" && "block",
    isLoading ? "opacity-0" : "opacity-100"
  );
}

export function PageDisplay({
  currentPage,
  pages: _pages,
  isDoublePage,
  shouldShowDoublePage,
  imageBlobUrls,
  imageErrors,
  onRetryImage,
  isRTL,
  fitMode,
  pageTurn,
  startBump,
}: PageDisplayProps) {
  // États dérivés directement pendant le rendu (pas de setState dans un effet).
  const currentBlobUrl = imageBlobUrls[currentPage];
  const nextBlobUrl = imageBlobUrls[currentPage + 1];
  const isLoading = !currentBlobUrl;
  const hasError = !!imageErrors[currentPage];
  const secondPageLoading = !nextBlobUrl;
  const secondPageHasError = !!imageErrors[currentPage + 1];

  const showSecondPage = isDoublePage && shouldShowDoublePage(currentPage);

  /* ---------------------------------------------------------------------
   * Tourné de page. On garde la dernière mesure de ce qui est à l'écran ;
   * quand la page change, l'ancienne mesure décrit la feuille à tourner.
   * ------------------------------------------------------------------ */
  const reduceMotion = usePrefersReducedMotion();
  const page1Ref = useRef<HTMLImageElement>(null);
  const page2Ref = useRef<HTMLImageElement>(null);
  const snapshotRef = useRef<ReaderSnapshot | null>(null);
  const turnIdRef = useRef(0);
  const [turn, setTurn] = useState<{ id: number; plan: TurnPlan; duration: number } | null>(null);

  const takeSnapshot = useCallback((): ReaderSnapshot => {
    const first = { url: currentBlobUrl ?? null, rect: measure(page1Ref.current) };
    if (!showSecondPage) return { currentPage, slots: [first] };
    const second = { url: nextBlobUrl ?? null, rect: measure(page2Ref.current) };
    return { currentPage, slots: isRTL ? [second, first] : [first, second] };
  }, [currentPage, currentBlobUrl, nextBlobUrl, showSecondPage, isRTL]);

  // Une image décodée après le rendu, ou une fenêtre redimensionnée, change
  // le cadre des pages : la mesure suit.
  const refreshSnapshot = useCallback(() => {
    snapshotRef.current = takeSnapshot();
  }, [takeSnapshot]);

  useLayoutEffect(() => {
    const previous = snapshotRef.current;
    const next = takeSnapshot();
    snapshotRef.current = next;
    if (!pageTurn || reduceMotion || !previous || previous.currentPage === next.currentPage) return;
    if ((window.visualViewport?.scale ?? 1) > 1.15) return;
    const plan = planTurn(previous, next, isRTL);
    if (!plan) return;
    turnIdRef.current += 1;
    setTurn({
      id: turnIdRef.current,
      plan,
      duration: plan.backUrl ? TURN_DURATION_SPREAD : TURN_DURATION_SINGLE,
    });
  }, [takeSnapshot, isRTL, reduceMotion, pageTurn]);

  useEffect(() => {
    window.addEventListener("resize", refreshSnapshot);
    return () => window.removeEventListener("resize", refreshSnapshot);
  }, [refreshSnapshot]);

  const endTurn = useCallback(() => setTurn(null), []);

  // Début du livre : la page cède un peu dans le sens du geste, puis revient,
  // comme une couverture qu'on tire alors qu'il n'y a rien avant.
  const spreadRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (startBump === 0 || reduceMotion) return;
    const pull = isRTL ? -22 : 22;
    spreadRef.current?.animate(
      [
        { transform: "translateX(0)" },
        { transform: `translateX(${pull}px) rotateY(${isRTL ? 4 : -4}deg)`, offset: 0.35 },
        { transform: `translateX(${-pull * 0.25}px)`, offset: 0.7 },
        { transform: "translateX(0)" },
      ],
      { duration: 480, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
    );
  }, [startBump, isRTL, reduceMotion]);

  const outerOverflow =
    fitMode === "fit"
      ? "overflow-hidden"
      : fitMode === "width"
        ? "overflow-y-auto overflow-x-hidden"
        : fitMode === "height"
          ? "overflow-x-auto overflow-y-hidden"
          : "overflow-auto";

  const innerSizing = cn(
    // Le lecteur est un overlay fixe : le spread doit se centrer par rapport au
    // viewport, jamais à un parent flex qui peut se réduire à son contenu.
    "relative flex w-screen min-w-screen max-w-none px-2 sm:px-4",
    fitMode === "fit" && "h-[calc(100dvh-2.5rem)] items-center justify-center",
    fitMode === "width" && "min-h-[calc(100dvh-2.5rem)] items-start justify-center",
    fitMode === "height" && "h-[calc(100dvh-2.5rem)] items-center min-w-full",
    fitMode === "original" && "min-h-[calc(100dvh-2.5rem)] items-start"
  );

  // En modes non-"fit", contenir l'image dans un wrapper auto-sizé pour ne pas
  // forcer la mise en colonne 50/50 hostile au scroll natif.
  const pageWrapperClass = (isPage1: boolean) =>
    cn(
      "relative flex items-center",
      fitMode === "fit" ? "h-full" : "h-auto",
      showSecondPage
        ? fitMode === "fit"
          ? "w-1/2"
          : "shrink-0"
        : "w-full justify-center",
      showSecondPage && {
        [isPage1 ? "order-2 justify-start" : "order-1 justify-end"]: isRTL,
        [isPage1 ? "order-1 justify-end" : "order-2 justify-start"]: !isRTL,
      }
    );

  return (
    <div
      className={cn(
        "relative flex w-screen max-w-none flex-1 self-stretch items-center justify-center",
        outerOverflow
      )}
    >
      {/* La première page se pose à l'ouverture du livre (une seule fois : ce
          conteneur ne se remonte pas au fil des pages). */}
      <div
        ref={spreadRef}
        className={cn(innerSizing, "motion-safe:animate-reader-in [perspective:1600px]")}
        // Les entrées (livre, page) déplacent les pages le temps de jouer : on
        // remesure une fois posées, la feuille du prochain tourné en dépend.
        onAnimationEnd={refreshSnapshot}
      >
        {/* Page 1 */}
        <div className={pageWrapperClass(true)}>
          {isLoading && !hasError && !imageErrors[currentPage] && (
            <div className="absolute inset-0 flex items-center justify-center z-10 opacity-0 animate-fade-in">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20"></div>
                <div
                  className="absolute inset-0 animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-primary"
                  style={{ animationDuration: "0.8s" }}
                ></div>
              </div>
            </div>
          )}
          {hasError || imageErrors[currentPage] ? (
            <ErrorPlaceholder onRetry={() => onRetryImage(currentPage)} />
          ) : imageBlobUrls[currentPage] ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={page1Ref}
                key={`page-${currentPage}-${imageBlobUrls[currentPage]}`}
                src={imageBlobUrls[currentPage]}
                onLoad={refreshSnapshot}
                alt={`Page ${currentPage}`}
                className={imageClassNameFor(fitMode, isLoading)}
                loading="eager"
              />
            </>
          ) : null}
        </div>

        {/* Page 2 (double page) */}
        {showSecondPage && (
          <div className={pageWrapperClass(false)}>
            {secondPageLoading && !secondPageHasError && !imageErrors[currentPage + 1] && (
              <div className="absolute inset-0 flex items-center justify-center z-10 opacity-0 animate-fade-in">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20"></div>
                  <div
                    className="absolute inset-0 animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-primary"
                    style={{ animationDuration: "0.8s" }}
                  ></div>
                </div>
              </div>
            )}
            {secondPageHasError || imageErrors[currentPage + 1] ? (
              <ErrorPlaceholder onRetry={() => onRetryImage(currentPage + 1)} />
            ) : imageBlobUrls[currentPage + 1] ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={page2Ref}
                  key={`page-${currentPage + 1}-${imageBlobUrls[currentPage + 1]}`}
                  src={imageBlobUrls[currentPage + 1]}
                  onLoad={refreshSnapshot}
                  alt={`Page ${currentPage + 1}`}
                  className={imageClassNameFor(fitMode, secondPageLoading)}
                  loading="eager"
                />
              </>
            ) : null}
          </div>
        )}
      </div>

      {turn && (
        <PageTurnOverlay key={turn.id} plan={turn.plan} duration={turn.duration} onDone={endTurn} />
      )}
    </div>
  );
}
