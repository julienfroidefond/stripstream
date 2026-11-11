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

import { useMotionNumberEvent } from "@/lib/motion-value";
import { usePresence } from "@/components/motion";
import { gsap } from "@/lib/gsap";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useTranslate } from "@/hooks/useTranslate";
import { useUserScope } from "@/contexts/UserScopeContext";
import { buildStorageKey } from "@/lib/storage";
import { cn } from "@/lib/utils";
import {
  WALL_FOCUS_DURATION,
  sheetMaxHeightFor,
  wallFocusCamera,
  wallFocusRect,
  type WallFocusMode,
} from "@/lib/wall-camera";
import { wallPreloadUrls } from "@/lib/wall-cover";
import {
  filterWallItems,
  isWallItemComplete,
  parseStoredHideRead,
  parseStoredWallLibraries,
} from "@/lib/wall-filter";
import { isWallUiTarget } from "@/lib/wall-gesture";
import {
  buildWallLayout,
  hashId,
  visibleWallTiles,
} from "@/lib/wall-layout";
import {
  type WallClickGuardState,
  clearWallClickGuard,
  createWallClickGuardState,
  isWallClickGuarded,
} from "@/lib/wall-pinch";
import type { WallItem, WallRect, WallRenderTile } from "@/types/wall";
import { WallFrame } from "./WallFrame";
import {
  WallPlaque,
  type WallPlaqueAnchor,
  type WallPlaquePlacement,
} from "./WallPlaque";
import { WallTile } from "./WallTile";
import { useWallCamera } from "./useWallCamera";
import { useWallGestures } from "./useWallGestures";
import { useWallPhase } from "./useWallPhase";

interface WallExperienceProps {
  items: WallItem[];
}

interface LibraryEntry {
  name: string;
  count: number;
}

const SHEET_BREAKPOINT = 900;
const PANEL_MIN_WIDTH = 300;
const PANEL_MAX_WIDTH = 376;
const PANEL_GAP = 26;
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
/** Filtres retenus d'une visite à l'autre, par utilisateur. */
const FILTERS_STORAGE_SUFFIX = "wall-libraries";
const HIDE_READ_STORAGE_SUFFIX = "wall-hide-read";
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
  // Init paresseuse : `useRef(createWallClickGuardState())` recréerait l'objet
  // à chaque rendu pour ne conserver que le premier.
  const clickGuardRef = useRef<WallClickGuardState | null>(null);
  const clickGuard = (clickGuardRef.current ??= createWallClickGuardState());

  const [flashKey, setFlashKey] = useState<string | null>(null);
  const [enterTiles, setEnterTiles] = useState(true);
  const [dimOn, setDimOn] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedLibraries, setSelectedLibraries] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const [hideRead, setHideRead] = useState(false);

  const libraries = useMemo<LibraryEntry[]>(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      counts.set(item.libraryName, (counts.get(item.libraryName) ?? 0) + 1);
    }
    return Array.from(counts, ([name, count]) => ({ name, count })).sort(
      (first, second) =>
        first.name.localeCompare(second.name, currentLanguage, {
          sensitivity: "base",
        })
    );
  }, [items, currentLanguage]);

  // Les filtres sont retenus par utilisateur. La lecture attend une frame
  // après l'hydratation : le serveur ne connaît pas `localStorage`.
  const scope = useUserScope();
  const filtersStorageKey = buildStorageKey(scope, FILTERS_STORAGE_SUFFIX);
  const hideReadStorageKey = buildStorageKey(scope, HIDE_READ_STORAGE_SUFFIX);
  const filtersRestoredRef = useRef(false);
  const filtersHydratedRef = useRef(false);
  const skipEntranceRef = useRef(false);

  useEffect(() => {
    if (filtersRestoredRef.current) return;
    filtersRestoredRef.current = true;

    let storedLibraries: string | null = null;
    let storedHideRead: string | null = null;
    try {
      storedLibraries = window.localStorage.getItem(filtersStorageKey);
      storedHideRead = window.localStorage.getItem(hideReadStorageKey);
    } catch {
      // Un stockage inaccessible ne doit pas empêcher le mur de s'ouvrir.
      filtersHydratedRef.current = true;
      return;
    }

    const available = new Set(libraries.map((library) => library.name));
    const restoredLibraries = parseStoredWallLibraries(
      storedLibraries,
      available
    );
    const restoredHideRead = parseStoredHideRead(storedHideRead);

    if (restoredLibraries.length === 0 && !restoredHideRead) {
      filtersHydratedRef.current = true;
      return;
    }

    skipEntranceRef.current = true;
    // Volontairement pas de cancel : en StrictMode, le nettoyage du premier
    // passage annulerait la restauration avant même qu'elle ait eu lieu.
    window.requestAnimationFrame(() => {
      filtersHydratedRef.current = true;
      if (restoredLibraries.length > 0) {
        setSelectedLibraries(new Set(restoredLibraries));
      }
      if (restoredHideRead) setHideRead(true);
    });
  }, [filtersStorageKey, hideReadStorageKey, libraries]);

  useEffect(() => {
    if (!filtersHydratedRef.current) return;
    try {
      window.localStorage.setItem(
        filtersStorageKey,
        JSON.stringify([...selectedLibraries].sort())
      );
    } catch {
      // Même garde qu'à la lecture : un stockage plein ou désactivé ne doit
      // pas faire tomber le mur.
    }
  }, [filtersStorageKey, selectedLibraries]);

  useEffect(() => {
    if (!filtersHydratedRef.current) return;
    try {
      window.localStorage.setItem(hideReadStorageKey, String(hideRead));
    } catch {
      // Idem : la préférence n'est simplement pas retenue.
    }
  }, [hideRead, hideReadStorageKey]);

  const visibleItems = useMemo(
    () => filterWallItems(items, selectedLibraries, hideRead),
    [hideRead, items, selectedLibraries]
  );

  // Un filtre qui vide le mur referme le panneau : sur mobile, la feuille de
  // filtres couvrirait l'état vide et son bouton de réinitialisation.
  const hadVisibleItemsRef = useRef(false);
  useEffect(() => {
    const hadVisibleItems = hadVisibleItemsRef.current;
    hadVisibleItemsRef.current = visibleItems.length > 0;
    if (hadVisibleItems && visibleItems.length === 0) setFiltersOpen(false);
  }, [visibleItems.length]);

  const completedCount = useMemo(
    () =>
      filterWallItems(items, selectedLibraries, false).filter(
        isWallItemComplete
      ).length,
    [items, selectedLibraries]
  );

  // La clé de sélection sert de graine : le même filtre redonne toujours le
  // même mur, un autre filtre ouvre une composition différente.
  const selectionKey = useMemo(() => {
    if (selectedLibraries.size === 0 && !hideRead) return "all";
    return JSON.stringify({
      libraries: [...selectedLibraries].sort(),
      hideRead,
    });
  }, [hideRead, selectedLibraries]);

  const layout = useMemo(
    () => buildWallLayout(selectionKey),
    [selectionKey]
  );

  const visibleLibraryCount = useMemo(
    () => new Set(visibleItems.map((item) => item.libraryName)).size,
    [visibleItems]
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
    }, 1500);
  }, [reduce]);

  const handleCameraMoved = useCallback(() => {
    if (hoveredRef.current) resetHover();
  }, [resetHover]);

  const handleSelectionChange = useCallback(() => {
    resetHover();
    closePlaque();
    clearFlash();
    if (skipEntranceRef.current) {
      skipEntranceRef.current = false;
    } else {
      replayEntrance();
    }
  }, [clearFlash, closePlaque, replayEntrance, resetHover]);

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
    x,
    y,
    scale,
    camera,
    viewport,
    canvasRef,
    overview,
    setOverview,
    panning,
    animateView,
    zoomBy,
    clampZoom,
    resetToInitial,
    fitView,
  } = wallCamera;

  const { dragging } = useWallGestures({
    stageRef,
    clickGuard,
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

  /**
   * Le voile de focus doit couvrir toutes les copies rendues, pas seulement la
   * plaque d'origine : sinon il disparaît dès qu'on s'éloigne du centre du
   * motif, et le mur redevient uniformément lumineux au scroll.
   */
  const dimRect = useMemo<WallRect | null>(() => {
    if (visibleTiles.length === 0) return null;

    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    for (const tile of visibleTiles) {
      left = Math.min(left, tile.x);
      top = Math.min(top, tile.y);
      right = Math.max(right, tile.x + tile.width);
      bottom = Math.max(bottom, tile.y + tile.height);
    }
    return {
      left,
      top,
      width: right - left,
      height: bottom - top,
    };
  }, [visibleTiles]);

  const updateZoomLabel = useCallback((value: number) => {
    if (zoomLabelRef.current) {
      zoomLabelRef.current.textContent = `${Math.round(value * 100)}%`;
    }
  }, []);

  useMotionNumberEvent(scale, updateZoomLabel);

  // Le cadrage initial est posé dans un effet interne à `useWallCamera`, avant
  // que cet abonnement (déclaré après) n'existe. Sans cette amorce, le libellé
  // resterait vide en mouvement réduit, où aucune animation ne vient le réveiller.
  useEffect(() => {
    updateZoomLabel(scale.get());
  }, [scale, updateZoomLabel, viewport.height, viewport.width]);

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
      const fine = hoverIsFine();
      const mode: WallFocusMode =
        fine && stageRect.width >= SHEET_BREAKPOINT && stageRect.height >= 460
          ? "anchor"
          : "sheet";
      const sheetMaxHeight =
        mode === "sheet" ? sheetMaxHeightFor(stageRect) : undefined;
      const target = wallFocusRect(
        { width: stageRect.width, height: stageRect.height },
        mode,
        sheetMaxHeight
      );
      if (!target) return;

      const next = wallFocusCamera(tile, target, clampZoom);
      animateView(next.scale, next.x, next.y, duration, "focus");
      setOverview(false);

      let anchor: WallPlaqueAnchor | null = null;
      if (mode === "anchor") {
        const coverLeft = target.left;
        const coverTop = target.top;
        const coverRight = coverLeft + target.width;
        const panelWidth = Math.min(
          PANEL_MAX_WIDTH,
          Math.max(PANEL_MIN_WIDTH, stageRect.width * 0.3)
        );
        const roomRight = stageRect.width - coverRight;
        const roomLeft = coverLeft;
        const side: WallPlaqueAnchor["side"] =
          roomRight >= roomLeft ? "right" : "left";
        const desiredLeft =
          side === "right"
            ? coverRight + PANEL_GAP
            : coverLeft - panelWidth - PANEL_GAP;
        const left = Math.max(
          16,
          Math.min(stageRect.width - panelWidth - 16, desiredLeft)
        );
        const half = Math.min(230, Math.max(90, stageRect.height / 2 - 18));
        const minTop = half + 14;
        const maxTop = stageRect.height - half - 14;
        const centerY = coverTop + target.height / 2;
        const top =
          maxTop <= minTop
            ? stageRect.height / 2
            : Math.max(minTop, Math.min(maxTop, centerY));

        anchor = { left, top, width: panelWidth, side };
      }

      // La salle reste éteinte pendant tout le vol : le voile ne se rallume
      // pas quand la caméra part, il attend la plaque (`data-plaque`).
      focus(
        {
          key: tile.key,
          index: tile.itemIndex,
          mode,
          anchor,
          sheetMaxHeight,
        },
        duration
      );
      // L'affiche visée passe devant le voile pendant le vol et répond au clic.
      settleFocusRef.current = pressFocusedTile(stage, tile, reduce);
    },
    [animateView, clampZoom, focus, reduce, setOverview]
  );

  const toggleFilters = useCallback(() => {
    closePlaque();
    setFiltersOpen((open) => !open);
  }, [closePlaque]);

  const toggleLibrary = useCallback(
    (name: string) => {
      closePlaque();
      setSelectedLibraries((previous) => {
        if (previous.size === 0) return new Set([name]);
        const next = new Set(previous);
        if (next.has(name)) next.delete(name);
        else next.add(name);
        return next;
      });
    },
    [closePlaque]
  );

  const toggleHideRead = useCallback(() => {
    closePlaque();
    setHideRead((hidden) => !hidden);
  }, [closePlaque]);

  const showAllLibraries = useCallback(() => {
    closePlaque();
    setSelectedLibraries(new Set());
  }, [closePlaque]);

  const showAllItems = useCallback(() => {
    closePlaque();
    setSelectedLibraries(new Set());
    setHideRead(false);
  }, [closePlaque]);

  const resetView = useCallback(() => {
    if (!viewport.width || !viewport.height) return;
    clearFlash();
    resetToInitial(0.9);
  }, [clearFlash, resetToInitial, viewport]);

  const toggleOverview = useCallback(() => {
    if (overview) resetView();
    else fitView();
  }, [fitView, overview, resetView]);

  const goToRandom = useCallback(() => {
    if (!viewport.width || !viewport.height || visibleTiles.length === 0) {
      return;
    }

    closePlaque();
    const currentScale = scale.get();
    const left = -x.get() / currentScale;
    const top = -y.get() / currentScale;
    const right = left + viewport.width / currentScale;
    const bottom = top + viewport.height / currentScale;
    const onScreen = visibleTiles.filter(
      (candidate) =>
        candidate.key !== active?.key &&
        candidate.x + candidate.width > left &&
        candidate.x < right &&
        candidate.y + candidate.height > top &&
        candidate.y < bottom
    );
    const pool = onScreen.length > 0 ? onScreen : visibleTiles;
    const tile = pool[Math.floor(Math.random() * pool.length)];
    if (!tile) return;

    clearFlash();
    setFlashKey(tile.key);
    flashTimerRef.current = window.setTimeout(() => {
      flashTimerRef.current = null;
      setFlashKey(null);
    }, 1600);

    // Le hasard fait le même geste qu'un clic, en plus ample : la tuile tirée
    // traverse le mur puis vient au centre.
    showFor(tile, 1.05);
  }, [
    active,
    clearFlash,
    closePlaque,
    scale,
    showFor,
    viewport,
    visibleTiles,
    x,
    y,
  ]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }

      // Une activation clavier ne doit pas être avalée par la garde laissée
      // par le pinch ou le drag précédent.
      if (event.key === "Enter" || event.key === " ") {
        clearWallClickGuard(clickGuard);
      }

      if (event.key === "Escape") {
        closePlaque();
        setFiltersOpen(false);
        return;
      }
      if (filtersOpen) return;

      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        zoomBy(ZOOM_STEP);
        return;
      }
      if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        zoomBy(1 / ZOOM_STEP);
        return;
      }
      if (event.key === "0") {
        event.preventDefault();
        resetView();
        return;
      }
      if (event.key === "f" || event.key === "F") {
        event.preventDefault();
        toggleOverview();
        return;
      }
      if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        goToRandom();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    clickGuard,
    closePlaque,
    filtersOpen,
    goToRandom,
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
      reduce ? 0 : 1600
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
  const scrimRendered = usePresence(filtersOpen, scrimRef, {
    enter: (timeline, scrim) => {
      timeline.fromTo(scrim, { opacity: 0 }, { opacity: 1, duration: 0.25 });
    },
    exit: (timeline, scrim) => {
      timeline.to(scrim, { opacity: 0, duration: 0.2 });
    },
  });

  // Le panneau de filtres bascule vers le spectateur depuis son bord bas.
  const filtersRef = useRef<HTMLDivElement>(null);
  const filtersRendered = usePresence(filtersOpen, filtersRef, {
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
    if (isWallClickGuarded(clickGuard, performance.now())) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (!isWallUiTarget(event.target)) closePlaque();
  };

  const handleDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isWallClickGuarded(clickGuard, performance.now())) {
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
            onClick={() => setFiltersOpen(false)}
          />
        )}

        <div
          data-wall-ui
          className={cn(
            "wall-zoom absolute bottom-4 left-4 z-30 flex items-center gap-1 sm:bottom-6 sm:left-6",
            filtersOpen && "pointer-events-none opacity-60"
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
                (filtersOpen ||
                  selectedLibraries.size > 0 ||
                  hideRead) &&
                  "is-active"
              )}
              onClick={toggleFilters}
              aria-label={t("wall.filters.label")}
              aria-haspopup="dialog"
              aria-expanded={filtersOpen}
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

        {!filtersOpen && (
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
