"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { gsap } from "@/lib/gsap";

type Listener = (value: number) => void;

/**
 * Valeur numérique animable, hors de React : l'équivalent minimal d'une
 * MotionValue framer pour la caméra du Wall.
 *
 * Les gestes l'écrivent à chaque frame (`set`), les transitions la font
 * glisser avec GSAP (`animateTo`), et les abonnés (`on`) répercutent chaque
 * changement sur le DOM sans re-render. Comme une MotionValue, `set` ne
 * coupe pas une animation en cours : c'est le rôle de `stop`.
 */
export class MotionNumber {
  private value: number;
  private readonly listeners = new Set<Listener>();
  private tween: gsap.core.Tween | null = null;

  constructor(initial: number) {
    this.value = initial;
  }

  get(): number {
    return this.value;
  }

  set(next: number): void {
    if (next === this.value) return;
    this.value = next;
    this.listeners.forEach((listener) => listener(next));
  }

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  isAnimating(): boolean {
    return this.tween !== null;
  }

  stop(): void {
    this.tween?.kill();
    this.tween = null;
  }

  /** Glisse vers `target` ; une durée nulle pose la valeur immédiatement. */
  animateTo(target: number, { duration, ease = "projection" }: { duration: number; ease?: string }): void {
    this.stop();
    if (duration <= 0) {
      this.set(target);
      return;
    }
    const proxy = { value: this.value };
    this.tween = gsap.to(proxy, {
      value: target,
      duration,
      ease,
      onUpdate: () => this.set(proxy.value),
      onComplete: () => {
        this.tween = null;
      },
    });
  }
}

/** Une `MotionNumber` stable pour la durée de vie du composant. */
export function useMotionNumber(initial: number): MotionNumber {
  const [value] = useState(() => new MotionNumber(initial));
  useEffect(() => () => value.stop(), [value]);
  return value;
}

/** Abonne `callback` (toujours la version la plus récente) aux changements. */
export function useMotionNumberEvent(value: MotionNumber, callback: Listener): void {
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  });
  useEffect(() => value.on((latest) => callbackRef.current(latest)), [value]);
}

/**
 * Applique une caméra (translation + échelle, origine en haut à gauche) et
 * une opacité à un élément, directement sur son style. Le premier rendu est
 * posé avant la peinture ; React ne possède ni `transform` ni `opacity`.
 */
export function useCameraStyle(
  ref: RefObject<HTMLElement | null>,
  camera: { x: MotionNumber; y: MotionNumber; scale: MotionNumber; opacity: MotionNumber }
): void {
  const { x, y, scale, opacity } = camera;

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const applyTransform = () => {
      element.style.transform = `translate3d(${x.get()}px, ${y.get()}px, 0) scale(${scale.get()})`;
    };
    const applyOpacity = () => {
      element.style.opacity = String(opacity.get());
    };
    applyTransform();
    applyOpacity();
    const unsubscribers = [x.on(applyTransform), y.on(applyTransform), scale.on(applyTransform), opacity.on(applyOpacity)];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [ref, x, y, scale, opacity]);
}
