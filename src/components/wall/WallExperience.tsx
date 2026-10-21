"use client";

import { useGesture } from "@use-gesture/react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
} from "framer-motion";
import {
  Check,
  LayoutGrid,
  LibraryBig,
  LocateFixed,
  Minus,
  Plus,
  Shuffle,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { EASE_FOCUS, EASE_PROJECTION } from "@/lib/motion";
import { useTranslate } from "@/hooks/useTranslate";
import { useUserScope } from "@/contexts/UserScopeContext";
import { buildStorageKey } from "@/lib/storage";
import { cn } from "@/lib/utils";
import {
  WALL_CELL_WIDTH,
  WALL_PATCH_HEIGHT,
  WALL_PATCH_WIDTH,
  WALL_TILE_ASPECT,
  buildWallLayout,
  hashId,
  visibleWallTiles,
} from "@/lib/wall-layout";
import type { WallItem, WallRect, WallRenderTile } from "@/types/wall";
import { WallFrame } from "./WallFrame";
import {
  WallPlaque,
  type WallPlaqueAnchor,
  type WallPlaquePlacement,
} from "./WallPlaque";
import { WallTile } from "./WallTile";

interface WallExperienceProps {
  items: WallItem[];
}

interface Viewport {
  width: number;
  height: number;
}

interface ActivePlaqueState {
  key: string;
  index: number;
  mode: "anchor" | "sheet";
  anchor: WallPlaqueAnchor | null;
  /** Hauteur maximale réservée à la feuille pour que l'affiche reste au-dessus. */
  sheetMaxHeight?: number;
}

type FocusMode = "anchor" | "sheet";

interface CameraState {
  x: number;
  y: number;
  scale: number;
}

interface DragOrigin {
  x: number;
  y: number;
}

interface PinchOrigin {
  scale: number;
  worldX: number;
  worldY: number;
}

interface LibraryEntry {
  name: string;
  count: number;
}

const MAX_ZOOM = 2.4;
const MIN_ZOOM = 0.28;
const SHEET_BREAKPOINT = 900;
const PANEL_MIN_WIDTH = 300;
const PANEL_MAX_WIDTH = 376;
const PANEL_GAP = 26;
/**
 * Taille de l'affiche une fois centrée : 52 % de la hauteur du cadre, sans
 * dépasser 480 px ni 42 % de la largeur. Sur un cadre étroit, la feuille prend
 * le bas de l'écran : l'affiche monte un peu et s'élargit pour rester lisible.
 */
const FOCUS_HEIGHT_RATIO = 0.52;
const FOCUS_SHEET_HEIGHT_RATIO = 0.4;
const FOCUS_MAX_HEIGHT = 480;
const FOCUS_MAX_WIDTH_RATIO = 0.42;
const FOCUS_SHEET_MAX_WIDTH_RATIO = 0.68;
/**
 * Feuille tactile : on lui réserve 46 % de la hauteur (sans jamais dépasser
 * 74 % de l'écran), et l'affiche se centre dans l'espace restant. Ainsi la
 * feuille ne recouvre jamais la couverture, même quand le résumé est long.
 */
const SHEET_MAX_RATIO = 0.46;
const SHEET_ABSOLUTE_RATIO = 0.74;
const SHEET_MIN_HEIGHT = 220;
const SHEET_GAP = 16;
/** Durée du vol de la tuile vers son plein cadre. */
const FOCUS_DURATION = 0.72;
/** Le survol ne doit pas « coller » aux tuiles qui défilent sous le curseur. */
const PAN_IDLE = 150;
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
/** Filtres de bibliothèques retenus d'une visite à l'autre, par utilisateur. */
const FILTERS_STORAGE_SUFFIX = "wall-libraries";
const DRAG_CLICK_GUARD = 420;
const DRAG_THRESHOLD = 3;
const MOMENTUM = 190;
const WHEEL_ZOOM = 0.0022;
const ZOOM_STEP = 1.28;
/** Seuils de recalcul de la liste des tuiles visibles pendant un geste. */
const CAMERA_SYNC_DISTANCE = 18;
const CAMERA_SYNC_ZOOM = 0.02;

/**
 * Échelle d'ouverture : on ne cherche pas à faire tenir tout le motif dans le
 * cadre (les couvertures seraient illisibles), mais à en montrer quelques
 * colonnes à taille d'affiche. La couverture reste le sujet.
 */
function initialScaleFor(viewport: Viewport, minScale: number): number {
  if (!viewport.width || !viewport.height) return 1;
  const targetColumns =
    viewport.width < 680 ? 4.2 : viewport.width < 1100 ? 6.4 : 8.4;
  const target = viewport.width / (WALL_CELL_WIDTH * targetColumns);
  return Math.min(1.12, Math.max(minScale, target));
}

function hoverIsFine(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches
  );
}

/**
 * Rect final de l'affiche centrée, dans le repère du cadre. C'est la même
 * géométrie qui sert à calculer la caméra et à poser la plaque : la tuile
 * cliquée est la seule à bouger, elle devient elle-même l'affiche.
 */
function sheetMaxHeightFor(viewport: Viewport): number {
  return Math.round(
    Math.min(
      viewport.height * SHEET_ABSOLUTE_RATIO,
      Math.max(SHEET_MIN_HEIGHT, viewport.height * SHEET_MAX_RATIO)
    )
  );
}

function focusRectFor(
  viewport: Viewport,
  mode: FocusMode,
  sheetMaxHeight = 0
): WallRect | null {
  if (viewport.width <= 0 || viewport.height <= 0) return null;

  const aspect = WALL_TILE_ASPECT;
  const availableHeight =
    mode === "sheet"
      ? Math.max(120, viewport.height - sheetMaxHeight - SHEET_GAP * 2)
      : viewport.height;
  let height = Math.min(
    FOCUS_MAX_HEIGHT,
    availableHeight,
    viewport.height *
      (mode === "sheet" ? FOCUS_SHEET_HEIGHT_RATIO : FOCUS_HEIGHT_RATIO)
  );
  let width = height * aspect;
  const maxWidth =
    viewport.width *
    (mode === "sheet" ? FOCUS_SHEET_MAX_WIDTH_RATIO : FOCUS_MAX_WIDTH_RATIO);
  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspect;
  }

  width = Math.round(width);
  height = Math.round(height);
  const centerY =
    mode === "sheet"
      ? SHEET_GAP + availableHeight / 2
      : viewport.height / 2;
  return {
    left: Math.round((viewport.width - width) / 2),
    top: Math.round(centerY - height / 2),
    width,
    height,
  };
}

function isUiTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element && Boolean(target.closest("[data-wall-ui]"))
  );
}

/**
 * Le Wall — surface de jeu.
 *
 * Les séries arrivent entières, la géométrie est calculée ici à partir de la
 * sélection : changer de bibliothèque redessine le mur sans recharger la page.
 * Un seul canvas transformé porte les quatre cents affiches ; les gestes
 * (glisser, pincer) viennent de `@use-gesture`, le vol d'inertie et le
 * rubber-band restent à la main pour garder le mur « lourd ».
 */
export function WallExperience({ items }: WallExperienceProps) {
  const { t, currentLanguage } = useTranslate();
  const prefersReducedMotion = useReducedMotion();
  const reduce = Boolean(prefersReducedMotion);

  const stageRef = useRef<HTMLDivElement>(null);
  const zoomLabelRef = useRef<HTMLSpanElement>(null);
  const flashTimerRef = useRef<number | null>(null);
  const entranceTimerRef = useRef<number | null>(null);
  const revealTimerRef = useRef<number | null>(null);
  const clickGuardTimerRef = useRef<number | null>(null);
  const panIdleTimerRef = useRef<number | null>(null);
  const cameraRafRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const initializedRef = useRef(false);
  const dragOriginRef = useRef<DragOrigin>({ x: 0, y: 0 });
  const pinchRef = useRef<PinchOrigin | null>(null);
  const dragBlockedRef = useRef(false);
  const cameraRef = useRef<CameraState>({ x: 0, y: 0, scale: 1 });

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);
  const canvasOpacity = useMotionValue(0);

  // Taille du cadre observée, jamais devinée : l'hydratation ne dépend pas
  // d'un `window.innerWidth` divergent entre serveur et client.
  const [viewport, setViewport] = useState<Viewport>({ width: 0, height: 0 });
  const [camera, setCamera] = useState<CameraState>({ x: 0, y: 0, scale: 1 });
  const [active, setActive] = useState<ActivePlaqueState | null>(null);
  const [dragging, setDragging] = useState(false);
  const [panning, setPanning] = useState(false);
  const [overview, setOverview] = useState(false);
  const [flashKey, setFlashKey] = useState<string | null>(null);
  const [enterTiles, setEnterTiles] = useState(true);
  const [dimOn, setDimOn] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedLibraries, setSelectedLibraries] = useState<
    ReadonlySet<string>
  >(() => new Set());

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

  // Le choix de bibliothèques est retenu par utilisateur. La lecture attend
  // une frame après l'hydratation : le serveur ne connaît pas `localStorage`.
  const scope = useUserScope();
  const filtersStorageKey = buildStorageKey(scope, FILTERS_STORAGE_SUFFIX);
  const filtersRestoredRef = useRef(false);
  const filtersHydratedRef = useRef(false);
  const skipEntranceRef = useRef(false);

  useEffect(() => {
    if (filtersRestoredRef.current) return;
    filtersRestoredRef.current = true;

    const finish = () => {
      filtersHydratedRef.current = true;
    };

    let parsed: unknown;
    try {
      parsed = JSON.parse(
        window.localStorage.getItem(filtersStorageKey) ?? "null"
      );
    } catch {
      // Une valeur corrompue ne doit pas empêcher le mur de s'ouvrir.
      finish();
      return;
    }
    if (!Array.isArray(parsed)) {
      finish();
      return;
    }

    const available = new Set(libraries.map((library) => library.name));
    const restored = parsed.filter(
      (name): name is string =>
        typeof name === "string" && available.has(name)
    );
    if (restored.length === 0) {
      finish();
      return;
    }

    skipEntranceRef.current = true;
    // Volontairement pas de cancel : en StrictMode, le nettoyage du premier
    // passage annulerait la restauration avant même qu'elle ait eu lieu.
    window.requestAnimationFrame(() => {
      filtersHydratedRef.current = true;
      setSelectedLibraries(new Set(restored));
    });
  }, [filtersStorageKey, libraries]);

  useEffect(() => {
    if (!filtersHydratedRef.current) return;
    window.localStorage.setItem(
      filtersStorageKey,
      JSON.stringify([...selectedLibraries].sort())
    );
  }, [filtersStorageKey, selectedLibraries]);

  const visibleItems = useMemo(
    () =>
      selectedLibraries.size === 0
        ? items
        : items.filter((item) => selectedLibraries.has(item.libraryName)),
    [items, selectedLibraries]
  );

  // La clé de sélection sert de graine : le même filtre redonne toujours le
  // même mur, un autre filtre ouvre une composition différente.
  const selectionKey = useMemo(
    () =>
      selectedLibraries.size === 0
        ? "all"
        : [...selectedLibraries].sort().join("|"),
    [selectedLibraries]
  );

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

  /**
   * Zoom minimal : le mur est un motif répété, on peut donc reculer bien plus
   * loin qu'une seule plaque. Le plancher évite simplement de rendre des
   * centaines de vignettes illisibles ; les copies voisines sont virtualisées.
   */
  const minScale = useMemo(() => {
    if (!viewport.width || !viewport.height) return MIN_ZOOM;
    return Math.min(
      MAX_ZOOM,
      Math.max(
        MIN_ZOOM,
        (viewport.width / layout.width) * 0.5,
        (viewport.height / layout.height) * 0.5
      )
    );
  }, [layout.height, layout.width, viewport.height, viewport.width]);

  const clampZoom = useCallback(
    (value: number) => Math.min(MAX_ZOOM, Math.max(minScale, value)),
    [minScale]
  );

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

  const updateZoomLabel = useCallback((value: number) => {
    if (zoomLabelRef.current) {
      zoomLabelRef.current.textContent = `${Math.round(value * 100)}%`;
    }
  }, []);

  useMotionValueEvent(scale, "change", updateZoomLabel);

  /**
   * La liste des tuiles rendues est recalculée par React, pas à chaque pixel
   * du geste : le canvas, lui, suit les MotionValues image par image. On ne
   * réveille donc React qu'après un déplacement ou un zoom significatif.
   */
  const syncCamera = useCallback(
    (force = false) => {
      const next = { x: x.get(), y: y.get(), scale: scale.get() };
      const previous = cameraRef.current;
      const moved =
        Math.abs(next.x - previous.x) + Math.abs(next.y - previous.y);
      const zoomed =
        previous.scale > 0
          ? Math.abs(next.scale - previous.scale) / previous.scale
          : 1;

      if (
        !force &&
        moved < CAMERA_SYNC_DISTANCE &&
        zoomed < CAMERA_SYNC_ZOOM
      ) {
        return;
      }

      cameraRef.current = next;
      setCamera(next);
      // La caméra a bougé : la tuile sous le curseur n'est plus celle qu'on
      // regardait, on rallume la salle.
      if (hoveredRef.current) resetHover();
    },
    [resetHover, scale, x, y]
  );

  const scheduleCameraSync = useCallback(() => {
    if (cameraRafRef.current !== null) return;
    cameraRafRef.current = window.requestAnimationFrame(() => {
      cameraRafRef.current = null;
      syncCamera(false);
    });
  }, [syncCamera]);

  useMotionValueEvent(x, "change", scheduleCameraSync);
  useMotionValueEvent(y, "change", scheduleCameraSync);
  useMotionValueEvent(scale, "change", scheduleCameraSync);

  const animateView = useCallback(
    (
      nextScale: number,
      nextX: number,
      nextY: number,
      duration = 0.8,
      ease: [number, number, number, number] = EASE_PROJECTION
    ) => {
      animate(scale, nextScale, {
        duration: reduce ? 0 : duration,
        ease,
      });
      animate(x, nextX, {
        duration: reduce ? 0 : duration,
        ease,
      });
      animate(y, nextY, {
        duration: reduce ? 0 : duration,
        ease,
      });
    },
    [reduce, scale, x, y]
  );

  const cancelReveal = useCallback(() => {
    if (revealTimerRef.current !== null) {
      window.clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
  }, []);

  const closePlaque = useCallback(() => {
    cancelReveal();
    setActive(null);
  }, [cancelReveal]);

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

  /**
   * Ouvre une œuvre en la faisant venir au centre : c'est la tuile cliquée
   * elle-même que la caméra vise, jamais un double posé au-dessus du mur. La
   * plaque se pose à côté d'elle pendant le vol. Sur un cadre étroit ou
   * tactile, elle devient une feuille et l'affiche remonte pour rester visible.
   */
  const showFor = useCallback(
    (tile: WallRenderTile, duration = FOCUS_DURATION) => {
      const stage = stageRef.current;
      if (!stage) return;

      closePlaque();

      const stageRect = stage.getBoundingClientRect();
      const fine = hoverIsFine();
      const mode: FocusMode =
        fine && stageRect.width >= SHEET_BREAKPOINT && stageRect.height >= 460
          ? "anchor"
          : "sheet";
      const sheetMaxHeight =
        mode === "sheet" ? sheetMaxHeightFor(stageRect) : undefined;
      const target = focusRectFor(
        { width: stageRect.width, height: stageRect.height },
        mode,
        sheetMaxHeight
      );
      if (!target) return;

      const nextScale = Math.min(
        MAX_ZOOM,
        Math.max(minScale, target.width / tile.width)
      );
      const nextX =
        target.left + target.width / 2 - (tile.x + tile.width / 2) * nextScale;
      const nextY =
        target.top + target.height / 2 - (tile.y + tile.height / 2) * nextScale;

      animateView(nextScale, nextX, nextY, duration, EASE_FOCUS);
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

      // La plaque arrive pendant le vol, quand l'affiche est déjà lancée.
      const delay = reduce ? 0 : Math.max(300, duration * 1000 - 300);
      revealTimerRef.current = window.setTimeout(() => {
        revealTimerRef.current = null;
        setActive({
          key: tile.key,
          index: tile.itemIndex,
          mode,
          anchor,
          sheetMaxHeight,
        });
      }, delay);
    },
    [animateView, closePlaque, minScale, reduce]
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

  const showAllLibraries = useCallback(() => {
    closePlaque();
    setSelectedLibraries(new Set());
  }, [closePlaque]);

  const zoomAt = useCallback(
    (nextScaleValue: number, clientX: number, clientY: number) => {
      const stage = stageRef.current;
      if (!stage) return;

      const nextScale = clampZoom(nextScaleValue);
      const currentScale = scale.get();
      if (Math.abs(nextScale - currentScale) < 0.0005) return;

      closePlaque();
      const rect = stage.getBoundingClientRect();
      const focusX = clientX - rect.left;
      const focusY = clientY - rect.top;
      const worldX = (focusX - x.get()) / currentScale;
      const worldY = (focusY - y.get()) / currentScale;

      scale.set(nextScale);
      x.set(focusX - worldX * nextScale);
      y.set(focusY - worldY * nextScale);
      setOverview(false);
    },
    [clampZoom, closePlaque, scale, x, y]
  );

  const zoomBy = useCallback(
    (factor: number) => {
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      scale.stop();
      x.stop();
      y.stop();
      zoomAt(
        scale.get() * factor,
        rect.left + rect.width / 2,
        rect.top + rect.height / 2
      );
    },
    [scale, x, y, zoomAt]
  );

  const resetView = useCallback(() => {
    if (!viewport.width || !viewport.height) return;
    closePlaque();
    clearFlash();
    const nextScale = initialScaleFor(viewport, minScale);
    animateView(
      nextScale,
      viewport.width / 2 - (WALL_PATCH_WIDTH / 2) * nextScale,
      viewport.height / 2 - (WALL_PATCH_HEIGHT / 2) * nextScale,
      0.9
    );
    setOverview(false);
  }, [
    animateView,
    clearFlash,
    closePlaque,
    minScale,
    viewport,
  ]);

  const fitView = useCallback(() => {
    if (!viewport.width || !viewport.height) return;
    closePlaque();
    const nextScale = clampZoom(minScale);
    const currentScale = scale.get();
    const worldX =
      currentScale > 0
        ? (viewport.width / 2 - x.get()) / currentScale
        : WALL_PATCH_WIDTH / 2;
    const worldY =
      currentScale > 0
        ? (viewport.height / 2 - y.get()) / currentScale
        : WALL_PATCH_HEIGHT / 2;
    animateView(
      nextScale,
      viewport.width / 2 - worldX * nextScale,
      viewport.height / 2 - worldY * nextScale,
      1
    );
    setOverview(true);
  }, [
    animateView,
    clampZoom,
    closePlaque,
    minScale,
    scale,
    viewport,
    x,
    y,
  ]);

  const toggleOverview = useCallback(() => {
    if (overview) resetView();
    else fitView();
  }, [fitView, overview, resetView]);

  const settleView = useCallback(
    (velocity?: readonly [number, number]) => {
      if (reduce || !velocity) return;
      if (Math.abs(velocity[0]) < 0.04 && Math.abs(velocity[1]) < 0.04) {
        return;
      }

      // Glissade courte : le mur s'arrête comme une plaque un peu lourde.
      animateView(
        scale.get(),
        x.get() + velocity[0] * MOMENTUM,
        y.get() + velocity[1] * MOMENTUM,
        0.7
      );
    },
    [animateView, reduce, scale, x, y]
  );

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

  const bind = useGesture(
    {
      onDragStart: (state) => {
        dragBlockedRef.current = isUiTarget(state.target);
        if (dragBlockedRef.current) return;

        dragOriginRef.current = { x: x.get(), y: y.get() };
        scale.stop();
        x.stop();
        y.stop();
        closePlaque();
        setOverview(false);
        setDragging(true);
      },
      onDrag: (state) => {
        if (dragBlockedRef.current || state.pinching) return;
        const [moveX, moveY] = state.movement;
        if (moveX === 0 && moveY === 0) return;

        setOverview(false);

        x.set(dragOriginRef.current.x + moveX);
        y.set(dragOriginRef.current.y + moveY);
      },
      onDragEnd: (state) => {
        setDragging(false);
        if (dragBlockedRef.current) {
          dragBlockedRef.current = false;
          return;
        }

        if (!state.tap) {
          suppressClickRef.current = true;
          if (clickGuardTimerRef.current !== null) {
            window.clearTimeout(clickGuardTimerRef.current);
          }
          clickGuardTimerRef.current = window.setTimeout(() => {
            clickGuardTimerRef.current = null;
            suppressClickRef.current = false;
          }, DRAG_CLICK_GUARD);
        }

        settleView(state.velocity);
      },
      onPinchStart: (state) => {
        if (isUiTarget(state.target)) {
          pinchRef.current = null;
          return;
        }
        const stage = stageRef.current;
        if (!stage) return;

        const rect = stage.getBoundingClientRect();
        const startScale = scale.get();
        const originX = state.origin[0] - rect.left;
        const originY = state.origin[1] - rect.top;

        pinchRef.current = {
          scale: startScale,
          worldX: (originX - x.get()) / startScale,
          worldY: (originY - y.get()) / startScale,
        };
        scale.stop();
        x.stop();
        y.stop();
        closePlaque();
          setOverview(false);
        setDragging(true);
      },
      onPinch: (state) => {
        const pinch = pinchRef.current;
        const stage = stageRef.current;
        if (!pinch || !stage) return;

        const rect = stage.getBoundingClientRect();
        const nextScale = clampZoom(
          pinch.scale * (1 + state.movement[0])
        );
        const originX = state.origin[0] - rect.left;
        const originY = state.origin[1] - rect.top;

        scale.set(nextScale);
        x.set(originX - pinch.worldX * nextScale);
        y.set(originY - pinch.worldY * nextScale);
      },
      onPinchEnd: () => {
        pinchRef.current = null;
        setDragging(false);
        settleView();
      },
    },
    {
      drag: {
        threshold: DRAG_THRESHOLD,
        preventScroll: false,
      },
      pinch: {
        // Le ctrl/⌘ + molette est géré par notre listener natif : sans ça,
        // use-gesture traite le même événement comme un pinch et double le zoom.
        pinchOnWheel: false,
      },
    }
  );

  const lastSelectionRef = useRef(selectionKey);

  // Première mise au point : le mur est déjà là, il se règle une fois.
  useEffect(() => {
    if (
      initializedRef.current ||
      !viewport.width ||
      !viewport.height
    ) {
      return;
    }
    initializedRef.current = true;

    const nextScale = initialScaleFor(viewport, minScale);
    const nextX =
      viewport.width / 2 - (WALL_PATCH_WIDTH / 2) * nextScale;
    const nextY =
      viewport.height / 2 - (WALL_PATCH_HEIGHT / 2) * nextScale;
    scale.set(nextScale);
    x.set(nextX);
    y.set(nextY);
    updateZoomLabel(nextScale);
    syncCamera(true);

    if (reduce) {
      canvasOpacity.set(1);
    } else {
      animate(canvasOpacity, 1, {
        duration: 0.7,
        ease: EASE_PROJECTION,
      });
    }
  }, [
    canvasOpacity,
    minScale,
    reduce,
    scale,
    syncCamera,
    updateZoomLabel,
    viewport,
    x,
    y,
  ]);

  // Nouveau filtre : le mur se redessine et le regard repart du centre.
  useEffect(() => {
    if (!initializedRef.current) return;
    if (lastSelectionRef.current === selectionKey) return;
    lastSelectionRef.current = selectionKey;
    resetHover();

    closePlaque();
    setOverview(false);
    clearFlash();
    if (skipEntranceRef.current) {
      skipEntranceRef.current = false;
    } else {
      replayEntrance();
    }

    if (!viewport.width || !viewport.height) return;
    const nextScale = initialScaleFor(viewport, minScale);
    animateView(
      nextScale,
      viewport.width / 2 - (WALL_PATCH_WIDTH / 2) * nextScale,
      viewport.height / 2 - (WALL_PATCH_HEIGHT / 2) * nextScale,
      0.8
    );
  }, [
    animateView,
    clearFlash,
    closePlaque,
    minScale,
    replayEntrance,
    resetHover,
    selectionKey,
    viewport,
  ]);

  // Un cadre qui change de taille garde le centre du regard et le zoom légal.
  useEffect(() => {
    if (!initializedRef.current || !viewport.width || !viewport.height) {
      return;
    }
    const current = scale.get();
    const nextScale = clampZoom(current);

    if (Math.abs(nextScale - current) > 0.001) {
      const worldX =
        current > 0
          ? (viewport.width / 2 - x.get()) / current
          : WALL_PATCH_WIDTH / 2;
      const worldY =
        current > 0
          ? (viewport.height / 2 - y.get()) / current
          : WALL_PATCH_HEIGHT / 2;
      scale.set(nextScale);
      x.set(viewport.width / 2 - worldX * nextScale);
      y.set(viewport.height / 2 - worldY * nextScale);
    }
    syncCamera(true);
  }, [clampZoom, scale, syncCamera, viewport, x, y]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const update = () => {
      setViewport({
        width: Math.round(stage.clientWidth),
        height: Math.round(stage.clientHeight),
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  /**
   * Pendant un geste, les tuiles passent sous le curseur : le survol serait
   * un stroboscope. On coupe l'effet de focus jusqu'à ce que la main s'arrête.
   */
  const markPanning = useCallback(() => {
    setPanning(true);
    if (panIdleTimerRef.current !== null) {
      window.clearTimeout(panIdleTimerRef.current);
    }
    panIdleTimerRef.current = window.setTimeout(() => {
      panIdleTimerRef.current = null;
      setPanning(false);
    }, PAN_IDLE);
  }, []);

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      const stage = stageRef.current;
      if (!stage) return;
      if (isUiTarget(event.target)) return;

      event.preventDefault();
      scale.stop();
      x.stop();
      y.stop();
      markPanning();

      if (event.ctrlKey || event.metaKey) {
        const factor = Math.exp(-event.deltaY * WHEEL_ZOOM);
        zoomAt(scale.get() * factor, event.clientX, event.clientY);
        return;
      }

      closePlaque();
      setOverview(false);

      const multiplier = event.deltaMode === 1 ? 18 : 1;
      x.set(x.get() - event.deltaX * multiplier);
      y.set(y.get() - event.deltaY * multiplier);
    },
    [
      closePlaque,
      markPanning,
      scale,
      x,
      y,
      zoomAt,
    ]
  );

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.addEventListener("wheel", handleWheel, { passive: false });
    return () => stage.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

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
        revealTimerRef,
        clickGuardTimerRef,
        panIdleTimerRef,
        hoverTimerRef,
      ];
      for (const timer of timers) {
        if (timer.current !== null) window.clearTimeout(timer.current);
      }
      if (cameraRafRef.current !== null) {
        window.cancelAnimationFrame(cameraRafRef.current);
      }
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

  const handleClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (!isUiTarget(event.target)) closePlaque();
  };

  const handleDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as Element | null;
    if (target?.closest("[data-wall-ui], .wall-tile")) return;
    resetView();
  };

  return (
    <WallFrame>
      <div
        ref={stageRef}
        {...bind()}
        data-dragging={dragging || undefined}
        data-panning={panning || dragging || undefined}
        data-plaque={active ? true : undefined}
        data-sheet={active?.mode === "sheet" || undefined}
        className={cn(
          "wall-stage absolute inset-0 touch-pan-y select-none",
          dragging ? "cursor-grabbing" : "cursor-grab"
        )}
        onClickCapture={handleClickCapture}
        onDoubleClick={handleDoubleClick}
      >
        <motion.div
          className="wall-canvas absolute left-0 top-0 origin-top-left [touch-action:none]"
          style={{
            width: layout.width,
            height: layout.height,
            x,
            y,
            scale,
            opacity: canvasOpacity,
          }}
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
        </motion.div>

        <div
          className="wall-vignette pointer-events-none absolute inset-0"
          aria-hidden
        />

        <div className="wall-hud pointer-events-none absolute inset-x-0 top-0 z-20">
          <div className="pl-5 pt-5 sm:pl-8 sm:pt-7">
            <p className="wall-eyebrow">
              <span className="wall-eyebrow-rule" aria-hidden />
              {t("wall.eyebrow")}
            </p>
            <h1 className="wall-title">{t("wall.title")}</h1>
            <p className="wall-count">
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

        <AnimatePresence>
          {filtersOpen && (
            <motion.button
              key="wall-filter-scrim"
              type="button"
              data-wall-ui="scrim"
              tabIndex={-1}
              aria-label={t("wall.filters.close")}
              className="wall-filter-scrim absolute inset-0 z-20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.25 }}
              onClick={() => setFiltersOpen(false)}
            />
          )}
        </AnimatePresence>

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
            <AnimatePresence>
              {filtersOpen && (
                <motion.div
                  key="wall-filters"
                  className="wall-filters"
                  role="group"
                  aria-label={t("wall.filters.label")}
                  initial={reduce ? false : { opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={
                    reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }
                  }
                  transition={{
                    duration: reduce ? 0 : 0.26,
                    ease: EASE_PROJECTION,
                  }}
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
                    {selectedLibraries.size > 0 && (
                      <button
                        type="button"
                        className="wall-filters-clear"
                        onClick={showAllLibraries}
                      >
                        {t("wall.filters.clear")}
                      </button>
                    )}
                  </div>

                  <p className="wall-filters-hint">
                    {t("wall.filters.hint")}
                  </p>

                  <div
                    className="wall-filters-list"
                    role="group"
                    aria-label={t("wall.filters.label")}
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
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="button"
              className={cn(
                "wall-control wall-control-wide wall-filter-trigger",
                (filtersOpen || selectedLibraries.size > 0) && "is-active"
              )}
              onClick={toggleFilters}
              aria-label={t("wall.filters.label")}
              aria-haspopup="dialog"
              aria-expanded={filtersOpen}
              title={t("wall.filters.label")}
            >
              <LibraryBig className="h-4 w-4" />
              <span className="hidden sm:inline">{t("wall.filters.short")}</span>
              <span
                className={cn(
                  "wall-filter-badge",
                  selectedLibraries.size > 0 && "is-filtered"
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

        <AnimatePresence initial={false}>
          {activeItem && placement && (
            <WallPlaque
              key={`${activeItem.id}:${placement.mode}`}
              item={activeItem}
              placement={placement}
              reduce={reduce}
              onClose={closePlaque}
            />
          )}
        </AnimatePresence>
      </div>
    </WallFrame>
  );
}
