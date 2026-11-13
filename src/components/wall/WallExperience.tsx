"use client";

import {
  Check,
  LayoutGrid,
  LocateFixed,
  Minus,
  Plus,
  Shuffle,
  SlidersHorizontal,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { preload } from "react-dom";

import { usePresence } from "@/components/motion";
import { gsap } from "@/lib/gsap";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useTranslate } from "@/hooks/useTranslate";
import { useUserScope } from "@/contexts/UserScopeContext";
import { cn } from "@/lib/utils";
import { WALL_FOCUS_DURATION } from "@/lib/wall-camera";
import {
  WALL_ENTRANCE_MS,
  WALL_RANDOM_FLASH_MS,
  pickRandomWallTile,
  wallDimRect,
} from "@/lib/wall-composition";
import { wallPreloadUrls } from "@/lib/wall-cover";
import { planWallFocus } from "@/lib/wall-focus";
import { isWallUiTarget } from "@/lib/wall-gesture";
import {
  buildWallLayout,
  hashId,
  visibleWallTiles,
} from "@/lib/wall-layout";
import {
  resolveWallShortcut,
  wallShortcutPreventsDefault,
} from "@/lib/wall-shortcuts";
import type { WallItem, WallRenderTile } from "@/types/wall";
import { WallFrame } from "./WallFrame";
import { WallPlaque, type WallPlaquePlacement } from "./WallPlaque";
import { WallTile } from "./WallTile";
import { useWallCamera } from "./useWallCamera";
import { useWallFilters } from "./useWallFilters";
import { useWallGestures } from "./useWallGestures";
import { useWallPhase } from "./useWallPhase";

interface WallExperienceProps {
  items: WallItem[];
}

/**
 * Le fond noir n'arrive qu'après une courte pause sur une affiche. En enchaînant
 * les survols, la salle reste donc éclairée : la lumière ne tombe que lorsqu'on
 * s'arrête sur une œuvre.
 */
const HOVER_DIM_DELAY = 220;
/**
 * Sortie du survol : une courte grâce permet d'annuler l'extinction quand le
 * pointeur glisse directement d'une affiche à sa voisine. Sans elle, chaque
 * changement de tuile ferait clignoter le voile.
 */
const HOVER_DIM_EXIT_DELAY = 160;
const ZOOM_STEP = 1.28;

function hoverIsFine(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches
  );
}

/**
 * Les couvertures du centre partent dès le rendu serveur (les `<link>` sont
 * alors dans la première réponse HTML) et, pour une navigation client, dès que
 * le composant est monté. Dans les deux cas, le navigateur réutilise ces
 * préchargements quand les `<img>` arrivent.
 */
function preloadWallCovers(urls: readonly string[]) {
  urls.forEach((url, index) => {
    preload(url, {
      as: "image",
      fetchPriority: index < 8 ? "high" : "auto",
    });
  });
}

/**
 * Pose l'affiche visée devant le voile le temps du vol de la caméra et lui
 * donne un retour tactile : elle s'enfonce comme un bouton pressé, jaillit,
 * puis se pose avec un rebond. Renvoie la fonction qui la rend au mur.
 */
function pressFocusedTile(
  stage: HTMLElement,
  tile: WallRenderTile,
  reduce: boolean
): (() => void) | null {
  const focused = stage.querySelector<HTMLElement>(
    `.wall-tile[data-wall-key="${CSS.escape(tile.key)}"]`
  );
  if (!focused) return null;
  focused.setAttribute("data-focus", "");

  if (!reduce) {
    gsap.killTweensOf(focused);
    gsap
      .timeline({ onComplete: () => gsap.set(focused, { clearProps: "transform" }) })
      .to(focused, { scale: 0.92, duration: 0.12, ease: "power2.out" })
      .to(focused, { scale: 1.06, duration: 0.18, ease: "power2.out" })
      .to(focused, { scale: 1, duration: 0.4, ease: "back.out(2.4)" });
  }

  return () => focused.removeAttribute("data-focus");
}

/**
 * Le Wall — surface de jeu.
 *
 * Les séries arrivent entières, la géométrie est calculée ici à partir de la
 * sélection : changer de bibliothèque redessine le mur sans recharger la page.
 * Un seul canvas transformé porte les quatre cents affiches ; les gestes
 * (glisser, pincer) sont lus directement sur les événements pointeur, et
 * l'inertie reste à la main pour garder le mur « lourd ».
 */
export function WallExperience({ items }: WallExperienceProps) {
  const { t, currentLanguage } = useTranslate();
  const reduce = usePrefersReducedMotion();

  /**
   * Le préchargement doit partir le plus tôt possible : côté serveur pendant le
   * rendu, côté client au montage (les tuiles sont montées dans le même commit,
   * le navigateur réutilise la requête en cours).
   */
  const preloadUrls = useMemo(() => wallPreloadUrls(items), [items]);
  if (typeof window === "undefined") {
    preloadWallCovers(preloadUrls);
  }
  useEffect(() => {
    preloadWallCovers(preloadUrls);
  }, [preloadUrls]);

  const stageRef = useRef<HTMLDivElement>(null);
  const zoomLabelRef = useRef<HTMLSpanElement>(null);
  const flashTimerRef = useRef<number | null>(null);
  const entranceTimerRef = useRef<number | null>(null);
  /** Rend au mur l'affiche visée par le vol en cours. */
  const settleFocusRef = useRef<(() => void) | null>(null);
  const settleFocus = useCallback(() => {
    settleFocusRef.current?.();
    settleFocusRef.current = null;
  }, []);
  const wallPhase = useWallPhase({ reduce, onSettleFocus: settleFocus });
  const { active, phase, tiltAllowed, focus, close, beginPan, endPan } =
    wallPhase;
  const closePlaque = close;

  const [flashKey, setFlashKey] = useState<string | null>(null);
  const [enterTiles, setEnterTiles] = useState(true);
  const [dimOn, setDimOn] = useState(false);

  // Les filtres sont retenus par utilisateur. La session possède la lecture,
  // le write gate, les items visibles et la clé de composition ; le composant
  // ne garde que la présentation du panneau et de la plaque.
  const scope = useUserScope();
  const {
    libraries,
    selectedLibraries,
    hideRead,
    visibleItems,
    visibleLibraryCount,
    completedCount,
    selectionKey,
    panelOpen,
    togglePanel,
    closePanel,
    toggleLibrary: toggleLibraryFilter,
    toggleHideRead: toggleHideReadFilter,
    showAllLibraries: clearLibraries,
    showAllItems: clearFilters,
    consumeEntranceSkip,
  } = useWallFilters({ items, scope, language: currentLanguage });

  const layout = useMemo(
    () => buildWallLayout(selectionKey),
    [selectionKey]
  );

  const seedOffset = useMemo(
    () =>
      hashId(`${selectionKey}:${visibleItems.length}`) %
      Math.max(1, visibleItems.length),
    [selectionKey, visibleItems.length]
  );

  // Le fond ne s'éteint qu'après une courte pause sur une affiche. En enchaînant
  // les survols, la salle reste donc éclairée au lieu de rester en mode sombre.
  const hoveredRef = useRef<string | null>(null);
  const hoverTimerRef = useRef<number | null>(null);

  const clearHoverTimer = useCallback(() => {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  const resetHover = useCallback(() => {
    clearHoverTimer();
    hoveredRef.current = null;
    setDimOn(false);
  }, [clearHoverTimer]);

  const handleTileHover = useCallback(
    (key: string, hovered: boolean) => {
      const next = hovered
        ? key
        : hoveredRef.current === key
          ? null
          : hoveredRef.current;
      if (next === hoveredRef.current) return;

      hoveredRef.current = next;
      clearHoverTimer();

      if (next) {
        // Le noir n'arrive qu'après une pause, jamais pendant un enchaînement
        // de survols : la salle reste allumée tant qu'on visite les affiches.
        hoverTimerRef.current = window.setTimeout(() => {
          setDimOn(true);
          hoverTimerRef.current = null;
        }, HOVER_DIM_DELAY);
        return;
      }

      hoverTimerRef.current = window.setTimeout(() => {
        setDimOn(false);
        hoverTimerRef.current = null;
      }, HOVER_DIM_EXIT_DELAY);
    },
    [clearHoverTimer]
  );

  const clearFlash = useCallback(() => {
    if (flashTimerRef.current !== null) {
      window.clearTimeout(flashTimerRef.current);
      flashTimerRef.current = null;
    }
    setFlashKey(null);
  }, []);

  /**
   * La vague d'ouverture : les affiches se posent en cascade. Elle ne rejoue
   * que sur une action franche (changement de filtre), jamais quand une tuile
   * virtualisée revient dans le cadre — c'était la source du clignotement.
   */
  const replayEntrance = useCallback(() => {
    if (entranceTimerRef.current !== null) {
      window.clearTimeout(entranceTimerRef.current);
      entranceTimerRef.current = null;
    }
    if (reduce) {
      setEnterTiles(false);
      return;
    }
    setEnterTiles(true);
    entranceTimerRef.current = window.setTimeout(() => {
      entranceTimerRef.current = null;
      setEnterTiles(false);
    }, WALL_ENTRANCE_MS);
  }, [reduce]);

  const handleCameraMoved = useCallback(() => {
    if (hoveredRef.current) resetHover();
  }, [resetHover]);

  const handleSelectionChange = useCallback(() => {
    resetHover();
    closePlaque();
    clearFlash();
    if (!consumeEntranceSkip()) replayEntrance();
  }, [
    clearFlash,
    closePlaque,
    consumeEntranceSkip,
    replayEntrance,
    resetHover,
  ]);

  // La caméra possède ses MotionNumbers, ses cadrages et l'inertie ; les
  // gestes ne font que lui parler. La composition ne garde que les tuiles,
  // la plaque, les filtres et le rendu.
  const wallCamera = useWallCamera({
    stageRef,
    layout,
    reduce,
    selectionKey,
    onCameraMoved: handleCameraMoved,
    onInteractionStart: closePlaque,
    onSelectionChange: handleSelectionChange,
  });
  const {
    camera,
    viewport,
    canvasRef,
    overview,
    panning,
    zoom,
    zoomBy,
    reset,
    fit,
    focusOn,
    viewRect,
  } = wallCamera;

  const { dragging, isClickGuarded, releaseClickGuard } = useWallGestures({
    stageRef,
    camera: wallCamera,
    onPanStart: beginPan,
    onPanEnd: endPan,
  });

  const visibleTiles = useMemo(
    () =>
      visibleWallTiles(
        layout,
        {
          ...camera,
          width: viewport.width,
          height: viewport.height,
        },
        visibleItems.length,
        seedOffset
      ),
    [
      camera,
      layout,
      seedOffset,
      viewport.height,
      viewport.width,
      visibleItems.length,
    ]
  );

  const dimRect = useMemo(() => wallDimRect(visibleTiles), [visibleTiles]);

  // Le libellé suit le zoom à chaque frame, hors de React. `subscribe` livre
  // tout de suite la valeur courante : aucun ordre d'effets à connaître.
  useEffect(
    () =>
      zoom.subscribe((value) => {
        if (zoomLabelRef.current) {
          zoomLabelRef.current.textContent = `${Math.round(value * 100)}%`;
        }
      }),
    [zoom]
  );

  /**
   * Ouvre une œuvre en la faisant venir au centre : c'est la tuile cliquée
   * elle-même que la caméra vise, jamais un double posé au-dessus du mur. La
   * plaque se pose à côté d'elle pendant le vol. Sur un cadre étroit ou
   * tactile, elle devient une feuille et l'affiche remonte pour rester visible.
   */
  const showFor = useCallback(
    (tile: WallRenderTile, duration = WALL_FOCUS_DURATION) => {
      const stage = stageRef.current;
      if (!stage) return;

      const stageRect = stage.getBoundingClientRect();
      const plan = planWallFocus(
        { width: stageRect.width, height: stageRect.height },
        hoverIsFine()
      );
      if (!plan) return;

      focusOn(tile, plan.target, duration);

      // La salle reste éteinte pendant tout le vol : le voile ne se rallume
      // pas quand la caméra part, il attend la plaque (`data-plaque`).
      focus(
        {
          key: tile.key,
          index: tile.itemIndex,
          mode: plan.mode,
          anchor: plan.anchor,
          sheetMaxHeight: plan.sheetMaxHeight,
        },
        duration
      );
      // L'affiche visée passe devant le voile pendant le vol et répond au clic.
      settleFocusRef.current = pressFocusedTile(stage, tile, reduce);
    },
    [focus, focusOn, reduce]
  );

  const toggleFilters = useCallback(() => {
    closePlaque();
    togglePanel();
  }, [closePlaque, togglePanel]);

  const toggleLibrary = useCallback(
    (name: string) => {
      closePlaque();
      toggleLibraryFilter(name);
    },
    [closePlaque, toggleLibraryFilter]
  );

  const toggleHideRead = useCallback(() => {
    closePlaque();
    toggleHideReadFilter();
  }, [closePlaque, toggleHideReadFilter]);

  const showAllLibraries = useCallback(() => {
    closePlaque();
    clearLibraries();
  }, [clearLibraries, closePlaque]);

  const showAllItems = useCallback(() => {
    closePlaque();
    clearFilters();
  }, [clearFilters, closePlaque]);

  const resetView = useCallback(() => {
    if (!viewport.width || !viewport.height) return;
    clearFlash();
    reset(0.9);
  }, [clearFlash, reset, viewport]);

  const toggleOverview = useCallback(() => {
    if (overview) resetView();
    else fit();
  }, [fit, overview, resetView]);

  const goToRandom = useCallback(() => {
    if (!viewport.width || !viewport.height || visibleTiles.length === 0) {
      return;
    }

    closePlaque();
    const tile = pickRandomWallTile(
      visibleTiles,
      viewRect(),
      active?.key,
      Math.random
    );
    if (!tile) return;

    clearFlash();
    setFlashKey(tile.key);
    flashTimerRef.current = window.setTimeout(() => {
      flashTimerRef.current = null;
      setFlashKey(null);
    }, WALL_RANDOM_FLASH_MS);

    // Le hasard fait le même geste qu'un clic, en plus ample : la tuile tirée
    // traverse le mur puis vient au centre.
    showFor(tile, 1.05);
  }, [active, clearFlash, closePlaque, showFor, viewRect, viewport, visibleTiles]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const action = resolveWallShortcut(event, { panelOpen });
      if (!action) return;
      if (wallShortcutPreventsDefault(action)) event.preventDefault();

      switch (action) {
        case "activate":
          releaseClickGuard();
          return;
        case "close":
          closePlaque();
          closePanel();
          return;
        case "zoom-in":
          zoomBy(ZOOM_STEP);
          return;
        case "zoom-out":
          zoomBy(1 / ZOOM_STEP);
          return;
        case "reset":
          resetView();
          return;
        case "overview":
          toggleOverview();
          return;
        case "random":
          goToRandom();
          return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    closePanel,
    closePlaque,
    panelOpen,
    goToRandom,
    releaseClickGuard,
    resetView,
    toggleOverview,
    zoomBy,
  ]);

  useEffect(() => {
    return () => {
      const timers = [
        flashTimerRef,
        entranceTimerRef,
        hoverTimerRef,
      ];
      for (const timer of timers) {
        if (timer.current !== null) window.clearTimeout(timer.current);
      }
      settleFocusRef.current?.();
      settleFocusRef.current = null;
    };
  }, []);

  // L'animation d'entrée ne joue qu'une fois, à l'ouverture du mur. Sans ce
  // verrou, chaque tuile virtualisée qui entre dans le cadre rejouerait le
  // fondu : c'est le clignotement observé pendant le défilement.
  useEffect(() => {
    if (!viewport.width || !viewport.height) return;
    const timer = window.setTimeout(
      () => setEnterTiles(false),
      reduce ? 0 : WALL_ENTRANCE_MS
    );
    return () => window.clearTimeout(timer);
  }, [reduce, viewport.height, viewport.width]);

  const activeItem = active ? visibleItems[active.index] : null;
  const placement = useMemo<WallPlaquePlacement | null>(() => {
    if (!active) return null;
    if (active.mode === "sheet")
      return { mode: "sheet", maxHeight: active.sheetMaxHeight };
    if (!active.anchor) return null;
    return { mode: "anchor", anchor: active.anchor };
  }, [active]);

  /**
   * Dernière plaque affichée : elle reste montée pendant sa sortie. Une autre
   * œuvre la remplace (nouvelle clé) et joue sa propre entrée.
   */
  const [plaque, setPlaque] = useState<{
    item: WallItem;
    placement: WallPlaquePlacement;
  } | null>(null);
  if (
    activeItem &&
    placement &&
    (plaque?.item !== activeItem || plaque.placement !== placement)
  ) {
    setPlaque({ item: activeItem, placement });
  }

  const scrimRef = useRef<HTMLButtonElement>(null);
  const scrimRendered = usePresence(panelOpen, scrimRef, {
    enter: (timeline, scrim) => {
      timeline.fromTo(scrim, { opacity: 0 }, { opacity: 1, duration: 0.25 });
    },
    exit: (timeline, scrim) => {
      timeline.to(scrim, { opacity: 0, duration: 0.2 });
    },
  });

  // Le panneau de filtres bascule vers le spectateur depuis son bord bas.
  const filtersRef = useRef<HTMLDivElement>(null);
  const filtersRendered = usePresence(panelOpen, filtersRef, {
    enter: (timeline, panel, still) => {
      timeline.fromTo(
        panel,
        still
          ? { opacity: 0 }
          : {
              opacity: 0,
              y: 18,
              rotateX: 24,
              scale: 0.94,
              transformPerspective: 900,
              transformOrigin: "100% 100%",
            },
        { opacity: 1, y: 0, rotateX: 0, scale: 1, duration: still ? 0.15 : 0.4, ease: "back.out(1.6)" }
      );
    },
    exit: (timeline, panel, still) => {
      timeline.to(
        panel,
        still
          ? { opacity: 0, duration: 0.15 }
          : { opacity: 0, y: 10, rotateX: 14, scale: 0.97, duration: 0.2, ease: "power2.in" }
      );
    },
  });

  const handleClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isClickGuarded()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (!isWallUiTarget(event.target)) closePlaque();
  };

  const handleDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isClickGuarded()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const target = event.target as Element | null;
    if (target?.closest("[data-wall-ui], .wall-tile")) return;
    resetView();
  };

  return (
    <WallFrame>
      <div
        ref={stageRef}
        data-dragging={dragging || undefined}
        data-panning={panning || dragging || phase === "pan" || undefined}
        data-plaque={phase === "plaque" || phase === "sheet" || undefined}
        data-focusing={phase === "focus" || undefined}
        data-sheet={phase === "sheet" || undefined}
        className={cn(
          "wall-stage absolute inset-0 select-none",
          dragging ? "cursor-grabbing" : "cursor-grab"
        )}
        onClickCapture={handleClickCapture}
        onDoubleClick={handleDoubleClick}
      >
        <div className="wall-surface absolute inset-0">
          <div
            ref={canvasRef}
            className="wall-canvas absolute left-0 top-0 origin-top-left [touch-action:none]"
            style={{ width: layout.width, height: layout.height }}
          >
            {visibleTiles.map((tile) => {
              const item = visibleItems[tile.itemIndex];
              if (!item) return null;
              return (
                <WallTile
                  key={tile.key}
                  item={item}
                  tile={tile}
                  active={active?.key === tile.key}
                  flash={flashKey === tile.key}
                  enter={enterTiles}
                  reduce={reduce}
                  tiltAllowed={
                    !reduce && tiltAllowed && !panning && !dragging
                  }
                  onSelect={showFor}
                  onHover={handleTileHover}
                />
              );
            })}

            <div
              className="wall-dim"
              data-visible={dimOn || undefined}
              style={
                dimRect
                  ? {
                      left: dimRect.left,
                      top: dimRect.top,
                      width: dimRect.width,
                      height: dimRect.height,
                    }
                  : undefined
              }
              aria-hidden
            />
          </div>

          <div
            className="wall-vignette pointer-events-none absolute inset-0"
            aria-hidden
          />
        </div>

        <div className="wall-hud pointer-events-none absolute inset-x-0 top-0 z-20">
          <div className="pl-5 pt-5 sm:pl-8 sm:pt-7">
            <p className="wall-eyebrow">
              <span className="wall-eyebrow-rule" aria-hidden />
              {t("wall.eyebrow")}
            </p>
            <h1 className="wall-title">{t("wall.title")}</h1>
            <p className="wall-count" data-testid="wall-count">
              {t("wall.count", { count: visibleItems.length })}
              <span className="wall-count-separator" aria-hidden />
              {t("wall.libraries", { count: visibleLibraryCount })}
            </p>
          </div>
        </div>

        <p className="sr-only">{t("wall.srHint")}</p>

        <div
          className="wall-bottom-fade pointer-events-none absolute inset-x-0 bottom-0 z-10"
          aria-hidden
        />

        {visibleItems.length === 0 && (
          <div
            data-wall-ui
            data-testid="wall-filter-empty"
            className="pointer-events-none absolute inset-0 z-[25] flex flex-col items-center justify-center gap-3 px-6 text-center"
          >
            {/* Le bouton reste hors de la région live : seul le message est
                annoncé poliment. */}
            <div role="status" className="flex flex-col items-center gap-3">
              <p className="wall-filters-title text-xl">
                {t("wall.filters.emptyTitle")}
              </p>
              <p className="max-w-sm text-sm text-muted-foreground">
                {t("wall.filters.emptyBody")}
              </p>
            </div>
            <button
              type="button"
              className="wall-control wall-control-wide pointer-events-auto"
              onClick={showAllItems}
            >
              {t("wall.filters.clear")}
            </button>
          </div>
        )}

        {scrimRendered && (
          <button
            ref={scrimRef}
            type="button"
            data-wall-ui="scrim"
            tabIndex={-1}
            aria-label={t("wall.filters.close")}
            className="wall-filter-scrim absolute inset-0 z-20"
            onClick={() => closePanel()}
          />
        )}

        <div
          data-wall-ui
          className={cn(
            "wall-zoom absolute bottom-4 left-4 z-30 flex items-center gap-1 sm:bottom-6 sm:left-6",
            panelOpen && "pointer-events-none opacity-60"
          )}
        >
          <button
            type="button"
            className="wall-control"
            onClick={() => zoomBy(1 / ZOOM_STEP)}
            aria-label={t("wall.zoomOut")}
            title={t("wall.zoomOut")}
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="wall-zoom-label"
            onClick={resetView}
            aria-label={t("wall.reset")}
            title={t("wall.reset")}
          >
            <span ref={zoomLabelRef} aria-hidden />
          </button>
          <button
            type="button"
            className="wall-control"
            onClick={() => zoomBy(ZOOM_STEP)}
            aria-label={t("wall.zoomIn")}
            title={t("wall.zoomIn")}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div
          data-wall-ui
          className="wall-actions absolute bottom-4 right-4 z-30 flex items-center gap-1 sm:bottom-6 sm:right-6"
        >
          <div className="wall-filter">
            {filtersRendered && (
              <div
                ref={filtersRef}
                className="wall-filters"
                role="group"
                aria-label={t("wall.filters.label")}
              >
                <div className="wall-filters-head">
                  <div className="min-w-0">
                    <p className="wall-filters-title">
                      {t("wall.filters.title")}
                    </p>
                    <p className="wall-filters-meta">
                      {t("wall.filters.meta", { count: libraries.length })}
                    </p>
                  </div>
                  {(selectedLibraries.size > 0 || hideRead) && (
                    <button
                      type="button"
                      className="wall-filters-clear"
                      onClick={showAllItems}
                    >
                      {t("wall.filters.clear")}
                    </button>
                  )}
                </div>

                <p className="wall-filters-hint">
                  {t("wall.filters.hint")}
                </p>

                <button
                  type="button"
                  data-testid="wall-filter-hide-read"
                  className={cn("wall-filter-row", hideRead && "is-active")}
                  aria-pressed={hideRead}
                  onClick={toggleHideRead}
                >
                  <span
                    className={cn("wall-filter-check", hideRead && "is-on")}
                    aria-hidden
                  >
                    {hideRead && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                  <span className="wall-filter-name">
                    {t("wall.filters.hideRead")}
                  </span>
                  <span
                    className="wall-filter-count"
                    data-testid="wall-filter-hide-read-count"
                  >
                    {t("wall.filters.completed", { count: completedCount })}
                  </span>
                </button>

                <div
                  className="wall-filters-list"
                  role="group"
                  aria-label={t("wall.filters.librariesLabel")}
                >
                  <button
                    type="button"
                    className={cn(
                      "wall-filter-row",
                      selectedLibraries.size === 0 && "is-active"
                    )}
                    aria-pressed={selectedLibraries.size === 0}
                    onClick={showAllLibraries}
                  >
                    <span
                      className={cn(
                        "wall-filter-check",
                        selectedLibraries.size === 0 && "is-on"
                      )}
                      aria-hidden
                    >
                      {selectedLibraries.size === 0 && (
                        <Check className="h-3 w-3" strokeWidth={3} />
                      )}
                    </span>
                    <span className="wall-filter-name">
                      {t("wall.filters.all")}
                    </span>
                    <span className="wall-filter-count">{items.length}</span>
                  </button>

                  {libraries.map((library) => {
                    const on = selectedLibraries.has(library.name);
                    return (
                      <button
                        key={library.name}
                        type="button"
                        className={cn(
                          "wall-filter-row",
                          on && "is-active"
                        )}
                        aria-pressed={on}
                        onClick={() => toggleLibrary(library.name)}
                      >
                        <span
                          className={cn(
                            "wall-filter-check",
                            on && "is-on"
                          )}
                          aria-hidden
                        >
                          {on && (
                            <Check className="h-3 w-3" strokeWidth={3} />
                          )}
                        </span>
                        <span
                          className="wall-filter-name"
                          title={library.name}
                        >
                          {library.name}
                        </span>
                        <span className="wall-filter-count">
                          {library.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="button"
              data-testid="wall-filter-trigger"
              className={cn(
                "wall-control wall-control-wide wall-filter-trigger",
                (panelOpen ||
                  selectedLibraries.size > 0 ||
                  hideRead) &&
                  "is-active"
              )}
              onClick={toggleFilters}
              aria-label={t("wall.filters.label")}
              aria-haspopup="dialog"
              aria-expanded={panelOpen}
              title={t("wall.filters.label")}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">{t("wall.filters.short")}</span>
              <span
                className={cn(
                  "wall-filter-badge",
                  (selectedLibraries.size > 0 || hideRead) && "is-filtered"
                )}
                aria-hidden
              >
                {selectedLibraries.size === 0
                  ? libraries.length
                  : selectedLibraries.size}
              </span>
            </button>
          </div>

          <button
            type="button"
            className={cn(
              "wall-control wall-control-wide",
              overview && "is-active"
            )}
            onClick={toggleOverview}
            aria-label={t("wall.overview")}
            aria-pressed={overview}
            title={t("wall.overview")}
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">{t("wall.overviewShort")}</span>
          </button>
          <button
            type="button"
            className="wall-control"
            onClick={goToRandom}
            aria-label={t("wall.random")}
            title={t("wall.random")}
          >
            <Shuffle className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="wall-control"
            onClick={resetView}
            aria-label={t("wall.reset")}
            title={t("wall.reset")}
          >
            <LocateFixed className="h-4 w-4" />
          </button>
        </div>

        {!panelOpen && (
          <p className="wall-hint pointer-events-none absolute bottom-6 left-1/2 z-20 hidden -translate-x-1/2 lg:block">
            {t("wall.hint")}
          </p>
        )}

        {plaque && (
          <WallPlaque
            key={`${plaque.item.id}:${plaque.placement.mode}`}
            open={Boolean(activeItem && placement)}
            item={plaque.item}
            placement={plaque.placement}
            onClose={closePlaque}
          />
        )}
      </div>
    </WallFrame>
  );
}
