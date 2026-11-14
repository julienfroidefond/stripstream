/**
 * Machine des pointeurs du Wall — politique pure.
 *
 * `useWallGestures` ne fait plus que traduire les événements pointeur en
 * `stepWallPointer(state, event, now)` puis appliquer les effets retournés à
 * la caméra, à React et aux écouteurs globaux. Toutes les décisions vivent
 * ici : idle / pan / pinch, recalage à l'arrivée ou au départ d'un doigt,
 * pointeurs ignorés sur les contrôles du mur, bouton fantôme d'une souris
 * relâchée hors de la fenêtre, passage pinch → pan sans tap, élan au
 * relâchement et garde qui avale le clic synthétique après un geste.
 */
import {
  WALL_TAP_SLOP,
  pushWallVelocitySample,
  wallDistance,
  wallMidpoint,
  wallReleaseVelocity,
  type WallPoint,
  type WallVelocitySample,
} from "./gesture";

/**
 * Fenêtre pendant laquelle le clic (ou double-clic) synthétique qui suit un
 * glissement ou un pinch est ignoré. Une seule valeur pour les deux gestes :
 * un nouvel appui ou une activation clavier la referme de toute façon.
 */
export const WALL_CLICK_GUARD_MS = 500;

export type WallPointerMode = "idle" | "pan" | "pinch";

export interface WallPointer extends WallPoint {
  id: number;
}

export interface WallPointerState {
  mode: WallPointerMode;
  /** Doigts suivis, dans l'ordre d'arrivée. */
  pointers: readonly WallPointer[];
  /** Pointeurs posés sur un contrôle du mur : la séquence ne déplace rien. */
  ignored: readonly number[];
  panId: number | null;
  panStart: WallPoint;
  panLast: WallPoint;
  /** Le geste a dépassé le seuil du tap (ou a été un pinch). */
  moved: boolean;
  /** Un pinch a eu lieu dans la séquence courante. */
  pinched: boolean;
  pinchIds: readonly [number, number] | null;
  /** Écart initial entre les deux doigts du pinch. */
  pinchSpan: number;
  samples: readonly WallVelocitySample[];
  /** `onPanStart` a été émis et attend son `onPanEnd`. */
  gestureActive: boolean;
  /** Les écouteurs globaux (window) sont branchés. */
  attached: boolean;
  /** Instant jusqu'auquel les clics sont avalés. */
  guardUntil: number;
}

export type WallPointerEvent =
  | {
      type: "down";
      id: number;
      x: number;
      y: number;
      pointerType: string;
      button: number;
      /** L'appui part d'un contrôle `[data-wall-ui]`. */
      onUi: boolean;
    }
  | {
      type: "move";
      id: number;
      x: number;
      y: number;
      pointerType: string;
      buttons: number;
    }
  | {
      type: "up";
      id: number;
      x: number;
      y: number;
      pointerType: string;
      button: number;
      /** `pointercancel` : le bouton n'est pas significatif. */
      cancel: boolean;
    }
  | { type: "blur" }
  /** Activation clavier explicite : elle rouvre les clics. */
  | { type: "activate" };

export type WallPointerEffect =
  | { type: "attach" }
  | { type: "detach" }
  /** Le premier doigt accepté prend la caméra (inertie et vols coupés). */
  | { type: "grab" }
  | { type: "panStart" }
  | { type: "panEnd" }
  | { type: "panBy"; dx: number; dy: number }
  /** Le geste devient un vrai glissement : la vue en cours se referme. */
  | { type: "dragStart" }
  | { type: "dragEnd" }
  | { type: "pinchStart"; midpoint: WallPoint }
  | { type: "pinchTo"; midpoint: WallPoint; ratio: number }
  | { type: "release"; velocityX: number; velocityY: number };

export interface WallPointerStep {
  state: WallPointerState;
  effects: WallPointerEffect[];
}

export function createWallPointerState(guardUntil = 0): WallPointerState {
  return {
    mode: "idle",
    pointers: [],
    ignored: [],
    panId: null,
    panStart: { x: 0, y: 0 },
    panLast: { x: 0, y: 0 },
    moved: false,
    pinched: false,
    pinchIds: null,
    pinchSpan: 1,
    samples: [],
    gestureActive: false,
    attached: false,
    guardUntil,
  };
}

export function isWallClickGuarded(
  state: Pick<WallPointerState, "guardUntil">,
  now: number
): boolean {
  return now < state.guardUntil;
}

/** Brouillon mutable, privé : `stepWallPointer` reste pur vu de l'extérieur. */
interface Draft extends Omit<WallPointerState, "pointers" | "ignored" | "samples"> {
  pointers: WallPointer[];
  ignored: number[];
  samples: WallVelocitySample[];
}

export function stepWallPointer(
  state: WallPointerState,
  event: WallPointerEvent,
  now: number
): WallPointerStep {
  const draft: Draft = {
    ...state,
    pointers: state.pointers.map((pointer) => ({ ...pointer })),
    ignored: [...state.ignored],
    samples: [...state.samples],
  };
  const effects: WallPointerEffect[] = [];
  const machine = new Machine(draft, effects, now);

  switch (event.type) {
    case "down":
      machine.down(event);
      break;
    case "move":
      machine.move(event);
      break;
    case "up":
      if (!event.cancel && event.pointerType === "mouse" && event.button !== 0) {
        break;
      }
      machine.release(event.id, { x: event.x, y: event.y }, true);
      break;
    case "blur":
      machine.blur();
      break;
    case "activate":
      draft.guardUntil = 0;
      break;
  }

  return { state: draft, effects };
}

class Machine {
  constructor(
    private readonly s: Draft,
    private readonly effects: WallPointerEffect[],
    private readonly now: number
  ) {}

  down(event: Extract<WallPointerEvent, { type: "down" }>): void {
    const s = this.s;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    if (s.pointers.length === 0 && s.ignored.length === 0) {
      // Nouvelle séquence : le geste précédent n'a plus de clic en attente.
      s.guardUntil = 0;
      this.resetSequence();
      this.attach();
    }

    // Un geste ne démarre jamais sur un contrôle du mur : le panneau garde
    // son défilement natif et ses boutons restent de simples boutons.
    if (event.onUi) {
      if (!s.ignored.includes(event.id)) s.ignored.push(event.id);
      return;
    }
    if (s.ignored.length > 0) return;

    if (s.pointers.length === 0) {
      this.effects.push({ type: "grab" });
      s.gestureActive = true;
      this.effects.push({ type: "panStart" });
    }

    this.setPointer(event.id, { x: event.x, y: event.y });
    this.syncPointers();
  }

  move(event: Extract<WallPointerEvent, { type: "move" }>): void {
    const s = this.s;
    if (!this.getPointer(event.id)) return;

    // Souris relâchée hors de la fenêtre : aucun `pointerup` ne nous est
    // parvenu. Le premier mouvement au retour termine le geste au lieu de
    // faire glisser le mur avec un bouton fantôme.
    if (event.pointerType === "mouse" && event.buttons === 0) {
      this.release(event.id, { x: event.x, y: event.y }, false);
      return;
    }

    const next = { x: event.x, y: event.y };
    this.setPointer(event.id, next);

    if (s.mode === "pan" && s.panId === event.id) {
      const dx = next.x - s.panLast.x;
      const dy = next.y - s.panLast.y;
      s.panLast = next;
      if (dx === 0 && dy === 0) return;

      // 1:1 dès le premier pixel : pas de seuil qui ferait sauter le mur.
      this.effects.push({ type: "panBy", dx, dy });

      if (!s.moved) {
        if (wallDistance(next, s.panStart) <= WALL_TAP_SLOP) return;
        s.moved = true;
        this.effects.push({ type: "dragStart" });
      }

      pushWallVelocitySample(s.samples, { ...next, t: this.now });
      return;
    }

    if (s.mode === "pinch" && s.pinchIds) {
      const first = this.getPointer(s.pinchIds[0]);
      const second = this.getPointer(s.pinchIds[1]);
      if (!first || !second) return;
      this.effects.push({
        type: "pinchTo",
        midpoint: wallMidpoint(first, second),
        ratio: wallDistance(first, second) / s.pinchSpan,
      });
    }
  }

  release(id: number, point: WallPoint, recordRelease: boolean): void {
    const s = this.s;
    const ignoredIndex = s.ignored.indexOf(id);
    if (ignoredIndex !== -1) {
      s.ignored.splice(ignoredIndex, 1);
      if (s.ignored.length === 0 && s.pointers.length === 0) this.detach();
      return;
    }
    if (!this.deletePointer(id)) return;

    // Le point de relâchement précise la vitesse quand le dernier
    // `pointermove` date de quelques images.
    if (recordRelease && s.mode === "pan" && s.panId === id && s.moved) {
      pushWallVelocitySample(s.samples, { ...point, t: this.now });
    }

    const wasMode = s.mode;
    this.syncPointers();
    if (s.pointers.length > 0) return;

    if (wasMode === "pan" && s.moved) {
      s.guardUntil = this.now + WALL_CLICK_GUARD_MS;
      const velocity = wallReleaseVelocity(s.samples, this.now);
      if (velocity) {
        this.effects.push({
          type: "release",
          velocityX: velocity[0],
          velocityY: velocity[1],
        });
      }
    }
    // WebKit relâche parfois le dernier doigt bien après le premier : c'est ce
    // relâchement final qui peut émettre le clic synthétique.
    if (s.pinched) s.guardUntil = this.now + WALL_CLICK_GUARD_MS;

    this.endSequence();
  }

  blur(): void {
    this.s.pointers = [];
    this.s.ignored = [];
    this.endSequence();
  }

  private endSequence(): void {
    if (this.s.gestureActive) {
      this.s.gestureActive = false;
      this.effects.push({ type: "panEnd" });
    }
    this.effects.push({ type: "dragEnd" });
    this.resetSequence();
    // Les écouteurs se débranchent : le `pointerup` d'un doigt resté sur un
    // contrôle ne nous parviendra plus. L'oublier, sinon il bloquerait tout
    // geste suivant (`ignored.length > 0`).
    this.s.ignored = [];
    this.detach();
  }

  /** Recale le geste après l'arrivée ou le départ d'un doigt, sans saut. */
  private syncPointers(): void {
    const s = this.s;
    if (s.pointers.length === 0) {
      s.mode = "idle";
      s.panId = null;
      s.pinchIds = null;
      return;
    }

    if (s.pointers.length === 1) {
      const [{ id }] = s.pointers;
      if (s.mode !== "pan" || s.panId !== id) this.beginPan(id);
      return;
    }

    const [first, second] = s.pointers;
    if (
      s.mode !== "pinch" ||
      !s.pinchIds ||
      s.pinchIds[0] !== first.id ||
      s.pinchIds[1] !== second.id
    ) {
      this.beginPinch();
    }
  }

  private beginPan(id: number): void {
    const s = this.s;
    const point = this.getPointer(id);
    if (!point) return;
    s.mode = "pan";
    s.panId = id;
    s.panStart = { x: point.x, y: point.y };
    s.panLast = { x: point.x, y: point.y };
    // Un doigt resté après un pinch ne doit jamais produire un tap.
    s.moved = s.pinched;
    s.samples = [];
  }

  private beginPinch(): void {
    const s = this.s;
    const [first, second] = s.pointers;
    s.mode = "pinch";
    s.panId = null;
    s.pinchIds = [first.id, second.id];
    s.pinchSpan = Math.max(1, wallDistance(first, second));
    s.pinched = true;
    s.moved = true;
    s.samples = [];
    s.guardUntil = this.now + WALL_CLICK_GUARD_MS;
    this.effects.push({ type: "pinchStart", midpoint: wallMidpoint(first, second) });
    this.effects.push({ type: "dragStart" });
  }

  private resetSequence(): void {
    const s = this.s;
    s.mode = "idle";
    s.panId = null;
    s.pinchIds = null;
    s.moved = false;
    s.pinched = false;
    s.samples = [];
  }

  private attach(): void {
    if (this.s.attached) return;
    this.s.attached = true;
    this.effects.push({ type: "attach" });
  }

  private detach(): void {
    if (!this.s.attached) return;
    this.s.attached = false;
    this.effects.push({ type: "detach" });
  }

  private getPointer(id: number): WallPointer | undefined {
    return this.s.pointers.find((pointer) => pointer.id === id);
  }

  private setPointer(id: number, point: WallPoint): void {
    const existing = this.getPointer(id);
    if (existing) {
      existing.x = point.x;
      existing.y = point.y;
    } else {
      this.s.pointers.push({ id, x: point.x, y: point.y });
    }
  }

  private deletePointer(id: number): boolean {
    const index = this.s.pointers.findIndex((pointer) => pointer.id === id);
    if (index === -1) return false;
    this.s.pointers.splice(index, 1);
    return true;
  }
}
