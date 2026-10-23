"use client";

import { useRef, useState } from "react";
import { burst } from "@/lib/celebrate";
import { gsap, prefersReducedMotion } from "@/lib/gsap";

interface RatingStarsProps {
  /** Rating on the 1-10 half-star scale, or null when unrated. */
  value: number | null;
  max?: number;
  readOnly?: boolean;
  onChange?: (rating: number) => void;
  onClear?: () => void;
  size?: "sm" | "md" | "lg";
}

function Star({ fill, sizePx }: { fill: "empty" | "half" | "full"; sizePx: number }) {
  const path = "M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z";

  if (fill === "full") {
    return (
      <svg width={sizePx} height={sizePx} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d={path} />
      </svg>
    );
  }

  if (fill === "half") {
    const id = `half-${sizePx}`;
    return (
      <svg width={sizePx} height={sizePx} viewBox="0 0 24 24" aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" x2="1" y1="0" y2="0">
            <stop offset="50%" stopColor="currentColor" />
            <stop offset="50%" stopColor="transparent" />
          </linearGradient>
        </defs>
        <path d={path} fill={`url(#${id})`} stroke="currentColor" strokeWidth="0.5" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg
      width={sizePx}
      height={sizePx}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

const SIZE_PX: Record<string, number> = { sm: 13, md: 17, lg: 21 };

export function RatingStars({
  value,
  max = 10,
  readOnly = false,
  onChange,
  onClear,
  size = "md",
}: RatingStarsProps) {
  const stars = max / 2;
  const px = SIZE_PX[size] ?? 17;
  const [hovered, setHovered] = useState<number | null>(null);
  const starsRef = useRef<HTMLDivElement>(null);

  const display = hovered ?? value ?? 0;

  function fill(starIdx: number): "empty" | "half" | "full" {
    if (display >= starIdx * 2) return "full";
    if (display >= starIdx * 2 - 1) return "half";
    return "empty";
  }

  function handleMouseMove(e: React.MouseEvent<HTMLSpanElement>, starIdx: number) {
    if (readOnly) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setHovered(e.clientX - rect.left < rect.width / 2 ? starIdx * 2 - 1 : starIdx * 2);
  }

  function handleClick(e: React.MouseEvent<HTMLSpanElement>, starIdx: number) {
    if (readOnly || !onChange) return;
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    onChange(e.clientX - rect.left < rect.width / 2 ? starIdx * 2 - 1 : starIdx * 2);
    celebrate(target, starIdx);
  }

  /** Les étoiles se remplissent une à une jusqu'à la note, puis une gerbe part. */
  function celebrate(chosen: HTMLElement, starIdx: number) {
    const container = starsRef.current;
    if (!container || prefersReducedMotion()) return;
    const lit = Array.from(container.children).slice(0, starIdx);
    gsap.fromTo(
      lit,
      { scale: 0.5, rotate: -25 },
      { scale: 1, rotate: 0, duration: 0.45, stagger: 0.05, ease: "back.out(3)", clearProps: "scale,rotate" }
    );
    gsap.delayedCall(lit.length * 0.05, () => burst(chosen, { count: 8, distance: 22 }));
  }

  const isActive = hovered !== null ? true : !!value;

  return (
    <div className="flex items-center gap-1">
      <div
        ref={starsRef}
        className={[
          "flex gap-0.5 transition-colors",
          isActive ? "text-primary" : "text-muted-foreground/60",
          !readOnly ? "cursor-pointer" : "",
        ].join(" ")}
        onMouseLeave={() => !readOnly && setHovered(null)}
        role={readOnly ? "img" : "slider"}
        aria-label={value ? `${value / 2} sur ${stars}` : "Non noté"}
        aria-valuenow={value ?? 0}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        {Array.from({ length: stars }, (_, i) => i + 1).map((idx) => (
          <span
            key={idx}
            onMouseMove={(e) => handleMouseMove(e, idx)}
            onClick={(e) => handleClick(e, idx)}
            className="inline-block transition-transform duration-150 ease-out active:scale-90"
          >
            <Star fill={fill(idx)} sizePx={px} />
          </span>
        ))}
      </div>
      {!readOnly && value !== null && value !== undefined && onClear && (
        <button
          onClick={onClear}
          data-testid="series-rating-clear"
          className="ml-0.5 text-muted-foreground hover:text-foreground transition-colors"
          title="Supprimer ma note"
          type="button"
          aria-label="Supprimer la note"
        >
          <svg
            width={11}
            height={11}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
