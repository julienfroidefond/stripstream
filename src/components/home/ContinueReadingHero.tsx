"use client";

import {
  useRef,
  useState,
  useTransition,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen } from "lucide-react";
import type { NormalizedBook, NormalizedSeries } from "@/lib/providers/types";
import { Button } from "@/components/ui/button";
import { LoadMoreLabel } from "@/components/ui/load-more-label";
import { useTranslate } from "@/hooks/useTranslate";
import { cn } from "@/lib/utils";
import { loadHomeFeed } from "@/app/actions/home";
import { CountUp, Magnetic, ProgressFill } from "@/components/motion";
import { ProjectionBackdrop } from "@/components/ui/projection-backdrop";
import { DirectionalSlide } from "@/components/ui/directional-slide";
import {
  gsap,
  prefersReducedMotion,
  ScrollTrigger,
  SplitText,
  useGSAP,
} from "@/lib/gsap";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

interface ContinueReadingHeroProps {
  books: NormalizedBook[];
  series?: NormalizedSeries[];
}

const ITEMS_PER_PAGE = 8;

interface HeroSlideProps {
  book: NormalizedBook;
  series?: NormalizedSeries[];
  staged: boolean;
  intro: boolean;
  reduce: boolean;
  onResume: (book: NormalizedBook) => void;
}

/**
 * Titre du générique : SplitText découpe le titre en mots, puis chaque mot
 * bascule en 3D depuis le fond, comme une réplique qui se relève. `autoSplit` re-découpe au resize sans rejouer
 * l'animation une fois l'ouverture terminée.
 */
function HeroTitle({
  text,
  intro,
  reduce,
}: {
  text: string;
  intro: boolean;
  reduce: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const played = useRef(false);

  useGSAP(
    () => {
      const element = ref.current;
      if (
        !element ||
        !intro ||
        reduce ||
        prefersReducedMotion() ||
        !text.trim()
      ) {
        return;
      }

      // Un remontage StrictMode rejoue l'effet : le flag est remis à zéro par
      // le cleanup, mais un vrai resize (autoSplit) ne doit pas rejouer.
      played.current = false;

      const split = SplitText.create(element, {
        type: "words",
        autoSplit: true,
        onSplit: (self) => {
          const targets = self.words;
          if (played.current) {
            gsap.set(targets, { clearProps: "opacity,transform" });
            return;
          }
          played.current = true;
          return gsap.fromTo(
            targets,
            {
              opacity: 0,
              yPercent: 70,
              z: -160,
              rotateX: -95,
              transformPerspective: 600,
              transformOrigin: "50% 100%",
            },
            {
              opacity: 1,
              yPercent: 0,
              z: 0,
              rotateX: 0,
              duration: 0.6,
              ease: "back.out(2)",
              stagger: 0.05,
              // Le titre se relève pendant que la cover finit son vol.
              delay: 0.3,
            }
          );
        },
      });

      return () => {
        played.current = false;
        split.kill();
        split.revert();
      };
    },
    { scope: ref, dependencies: [intro, reduce, text] }
  );

  return (
    <span ref={ref} className="inline-block">
      {text}
    </span>
  );
}

/**
 * Contenu d'un tome. Le composant est monté deux fois pendant un glissement
 * (sortant + entrant) : `staged` coupe la cascade d'ouverture sur la copie
 * sortante, pour qu'elle ne rejoue pas son entrée en scène.
 */
function HeroSlide({
  book,
  series,
  staged,
  intro,
  reduce,
  onResume,
}: HeroSlideProps) {
  const { t } = useTranslate();

  const target = book.seriesId?.trim() ?? "";
  const targetLower = target.toLowerCase();
  const matchedSeries =
    series?.find(
      (item) =>
        item.id === target ||
        item.name === target ||
        item.name.trim().toLowerCase() === targetLower
    ) ?? null;
  const seriesName = matchedSeries?.name ?? null;
  const summary = (() => {
    const fromBook = book.summary?.trim();
    if (fromBook) return fromBook;
    const fromSeries = matchedSeries?.summary?.trim();
    if (fromSeries) return fromSeries;
    const genres = matchedSeries?.genres?.filter(Boolean).slice(0, 3) ?? [];
    if (genres.length > 0) return genres.join(" • ");
    const author = matchedSeries?.authors?.find((item) => item.name)?.name;
    if (author) return author;
    return null;
  })();

  const currentPage = book.readProgress?.page ?? 0;
  const totalPages = book.pageCount;
  const hasProgress = currentPage > 0 && totalPages > 0;
  const percent = hasProgress
    ? Math.min(100, Math.round((currentPage / totalPages) * 100))
    : 0;

  const volumeLabel = book.number
    ? t("home.hero.tomeLabel", { number: book.number })
    : null;
  const bookTitle = book.title?.trim() || volumeLabel || "";

  /**
   * Les éléments marqués `data-hero-item` partent masqués (CSS) et sont
   * révélés par la timeline d'ouverture du hero, une fois les cases posées.
   */
  const stagedItem = staged && !reduce ? { "data-hero-item": "" } : {};

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-9">
      {/* Cover : l'enveloppe porte la profondeur (`translate`) et l'inclinaison
          à la souris. Pas de soulèvement au survol ici : l'enveloppe pivote
          sous le curseur, le survol basculerait à chaque mouvement près d'un
          bord et la cover sauterait. L'inclinaison suffit à la décoller. */}
      <div
        className="hero-depth-cover group/cover mx-auto shrink-0 sm:mx-0"
        data-hero-tilt="cover"
        {...(staged && !reduce ? { "data-hero-fly": "" } : {})}
      >
        <button
          type="button"
          data-testid="home-hero-cover"
          onClick={() => onResume(book)}
          className="hero-cover-shadow relative block aspect-2/3 w-[168px] overflow-hidden rounded-xl sm:w-[196px]"
          aria-label={t("home.hero.resume")}
        >
          {/* Le liseré est porté par la cover elle-même, pas par le cadre. */}
          <span className="relative block h-full w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={book.thumbnailUrl}
              alt={t("home.hero.coverAlt", { title: bookTitle })}
              loading="eager"
              draggable={false}
              className="h-full w-full object-cover"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-border"
            />
            {/* Reflet : il glisse sur la cover avec l'inclinaison. */}
            <span
              aria-hidden
              data-hero-glare
              className="hero-glare pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-500 group-hover:opacity-100 motion-reduce:hidden"
            />
          </span>
        </button>
      </div>

      {/* Content */}
      <div data-hero-tilt="copy" className="hero-depth-copy flex flex-1 flex-col justify-center gap-4 text-center text-foreground sm:text-left">
        <div
          className="flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-primary sm:justify-start"
          {...stagedItem}
        >
          <BookOpen className="h-3.5 w-3.5" />
          {t("home.hero.label")}
        </div>

        <h2 className="font-display text-3xl font-semibold leading-[1.05] tracking-tight sm:text-4xl lg:text-5xl">
          <HeroTitle
            text={seriesName ?? volumeLabel ?? bookTitle}
            intro={intro}
            reduce={reduce}
          />
          {seriesName && volumeLabel && (
            <span
              {...stagedItem}
              className="ml-3 inline-block align-middle text-lg font-normal text-muted-foreground sm:text-xl"
            >
              {volumeLabel}
            </span>
          )}
        </h2>

        {summary && (
          <p
            className="line-clamp-2 text-sm text-muted-foreground sm:text-base"
            {...stagedItem}
          >
            {summary}
          </p>
        )}

        {hasProgress && (
          <div
            className="mx-auto w-full max-w-md space-y-2 sm:mx-0"
            {...stagedItem}
          >
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/15">
              <ProgressFill percent={percent} />
            </div>
            <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground sm:justify-start">
              <span className="font-semibold text-foreground tabular-nums">
                <CountUp value={percent} suffix="%" />
              </span>
              <span className="tabular-nums">
                {t("home.hero.page", { current: currentPage, total: totalPages })}
              </span>
            </div>
          </div>
        )}

        <div className="mt-1 flex justify-center sm:justify-start" {...stagedItem}>
          <Magnetic>
            <Button
              data-testid="home-resume-reading"
              onClick={() => onResume(book)}
              size="lg"
              className="group/cta gap-2 font-semibold"
            >
              {hasProgress ? t("home.hero.resume") : t("home.hero.start")}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-out group-hover/cta:translate-x-1" />
            </Button>
          </Magnetic>
        </div>
      </div>
    </div>
  );
}

export function ContinueReadingHero({ books, series }: ContinueReadingHeroProps) {
  const router = useRouter();
  const { t } = useTranslate();
  const reduce = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [introPlayed, setIntroPlayed] = useState(false);
  /** L'inclinaison à la souris et la profondeur au scroll attendent l'ouverture. */
  const [introDone, setIntroDone] = useState(false);
  const [transition, setTransition] = useState<{
    from: NormalizedBook;
    direction: number;
    offset: number;
  } | null>(null);
  const [loadedBooks, setLoadedBooks] = useState(books.slice(0, ITEMS_PER_PAGE));
  const [hasMore, setHasMore] = useState(books.length > ITEMS_PER_PAGE);
  const [isPending, startTransition] = useTransition();
  const sectionRef = useRef<HTMLElement | null>(null);
  const sceneBackdropRef = useRef<HTMLDivElement | null>(null);
  const introBackdropRef = useRef<HTMLDivElement | null>(null);
  const sceneContentRef = useRef<HTMLDivElement | null>(null);
  const backdropLayerRef = useRef<HTMLDivElement | null>(null);
  const beamRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const parallaxRef = useRef<HTMLDivElement | null>(null);
  const firstBackdrop = useRef(true);
  const [firstBookId] = useState<string | null>(loadedBooks[0]?.id ?? null);
  /**
   * La mise en scène (cover posée dans son cadre, texte qui monte) ne joue
   * qu'à l'ouverture. Le carrousel change de diapositive ensuite : le geste se
   * rejouerait sinon sur chaque glissement, et l'image repasserait en petit à
   * chaque fois.
   */

  const total = loadedBooks.length;
  const hasMany = total > 1;
  const safeIndex = total > 0 ? ((index % total) + total) % total : 0;
  const book = loadedBooks[safeIndex];
  const staged = Boolean(book) && !introPlayed && !transition && book.id === firstBookId;

  const goTo = (target: number, direction: number, offset = 0) => {
    if (total === 0) return;
    const next = ((target % total) + total) % total;
    if (next === safeIndex) return;
    setIntroPlayed(true);
    if (reduce) {
      setIndex(next);
      setTransition(null);
      return;
    }
    setTransition({ from: book, direction, offset });
    setIndex(next);
  };

  const handleResume = (targetBook: NormalizedBook) => {
    router.push(`/books/${targetBook.id}`);
  };

  /**
   * Scène en relief : la cover pivote vers le curseur, le texte et le fond
   * glissent en sens inverse à des vitesses différentes. Le reflet et l'ombre
   * de la cover suivent via `--tilt-x` / `--tilt-y` (-1 → 1), en CSS. Aucun
   * état React pendant le survol ; rien au tactile ni sous reduced-motion.
   */
  const tiltScene = (x: number, y: number, settle = false) => {
    const section = sectionRef.current;
    if (!section) return;
    section.style.setProperty("--tilt-x", x.toFixed(3));
    section.style.setProperty("--tilt-y", y.toFixed(3));
    const motion = settle
      ? { duration: 1.4, ease: "elastic.out(1, 0.45)" }
      : { duration: 0.35, ease: "out" };
    gsap.to(section.querySelectorAll('[data-hero-tilt="cover"]'), {
      rotateY: x * 22,
      rotateX: -y * 16,
      z: settle ? 0 : 40,
      transformPerspective: 800,
      overwrite: "auto",
      ...motion,
    });
    gsap.to(section.querySelectorAll('[data-hero-tilt="copy"]'), {
      x: x * -14,
      y: y * -8,
      overwrite: "auto",
      ...motion,
    });
    if (parallaxRef.current) {
      gsap.to(parallaxRef.current, {
        x: x * -28,
        y: y * -18,
        overwrite: "auto",
        ...motion,
      });
    }
  };

  const handleHeroPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (reduce || event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const glow = glowRef.current;
    if (glow) {
      glow.style.setProperty("--hero-glow-x", `${event.clientX - rect.left}px`);
      glow.style.setProperty("--hero-glow-y", `${event.clientY - rect.top}px`);
    }
    if (!introDone || prefersReducedMotion()) return;
    tiltScene(
      ((event.clientX - rect.left) / rect.width - 0.5) * 2,
      ((event.clientY - rect.top) / rect.height - 0.5) * 2
    );
  };

  const handleHeroPointerLeave = (event: ReactPointerEvent<HTMLElement>) => {
    if (reduce || !introDone || event.pointerType !== "mouse") return;
    tiltScene(0, 0, true);
  };

  const handleLoadMore = () => {
    const firstNew = loadedBooks.length;
    startTransition(async () => {
      const result = await loadHomeFeed("continue-reading", firstNew);
      setLoadedBooks(result.items as NormalizedBook[]);
      setHasMore(result.hasMore);
      // La suite se pose sur la première nouveauté : le clic se voit.
      if (result.items.length > firstNew) {
        setIntroPlayed(true);
        if (!reduce && book) {
          setTransition({ from: book, direction: 1, offset: 0 });
        }
        setIndex(firstNew);
      }
    });
  };

  useGSAP(
    () => {
      const section = sectionRef.current;
      const backdrop = introBackdropRef.current;
      const beam = beamRef.current;
      if (!section || !backdrop) return;

      const items = Array.from(
        section.querySelectorAll<HTMLElement>("[data-hero-item]")
      );
      const fliers = Array.from(
        section.querySelectorAll<HTMLElement>("[data-hero-fly]")
      );
      const glares = Array.from(
        section.querySelectorAll<HTMLElement>("[data-hero-fly] [data-hero-glare]")
      );
      const settle = () => {
        section.removeAttribute("data-hero-intro");
        backdrop.removeAttribute("data-hero-backdrop");
        items.forEach((item) => item.removeAttribute("data-hero-item"));
        fliers.forEach((flier) => flier.removeAttribute("data-hero-fly"));
        gsap.set(section, { clearProps: "opacity,transform,transformOrigin" });
        gsap.set(backdrop, { clearProps: "transform" });
        gsap.set([...items, ...fliers, ...glares], {
          clearProps: "opacity,transform",
        });
      };

      if (reduce || prefersReducedMotion()) {
        settle();
        if (beam) gsap.set(beam, { autoAlpha: 0 });
        return;
      }

      /**
       * Ouverture en relief : la scène bascule vers le spectateur depuis
       * l'arrière, la cover arrive du fond en tournoyant et dépasse sa place,
       * puis un éclair de reflet et le faisceau marquent l'atterrissage.
       */
      const timeline = gsap.timeline({
        defaults: { ease: "projection" },
        onComplete: () => {
          settle();
          setIntroDone(true);
        },
      });

      timeline
        .fromTo(
          section,
          {
            opacity: 0,
            y: 80,
            rotateX: 24,
            scale: 0.9,
            transformPerspective: 1400,
            transformOrigin: "50% 100%",
          },
          { opacity: 1, y: 0, rotateX: 0, scale: 1, duration: 0.7, ease: "focus" },
          0
        )
        .to(backdrop, { scale: 1, duration: 1.1 }, 0);

      if (fliers.length > 0) {
        timeline.fromTo(
          fliers,
          {
            opacity: 0,
            x: -160,
            z: -700,
            rotateY: -80,
            rotateX: 20,
            rotateZ: -8,
            transformPerspective: 900,
          },
          {
            opacity: 1,
            x: 0,
            z: 0,
            rotateY: 0,
            rotateX: 0,
            rotateZ: 0,
            duration: 0.8,
            ease: "back.out(1.5)",
          },
          0.1
        );
      }

      if (glares.length > 0) {
        timeline
          .to(glares, { opacity: 1, duration: 0.08, ease: "power2.out" }, 0.62)
          .to(glares, { opacity: 0, duration: 0.45, ease: "out" }, 0.7);
      }

      if (items.length > 0) {
        timeline.fromTo(
          items,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.45, stagger: 0.05 },
          0.4
        );
      }

      if (beam) {
        gsap.set(beam, { xPercent: -130, opacity: 0 });
        timeline
          .fromTo(
            beam,
            { xPercent: -130, opacity: 0 },
            {
              xPercent: 250,
              opacity: 0.9,
              duration: 0.7,
              ease: "power2.inOut",
            },
            0.55
          )
          .to(beam, { opacity: 0, duration: 0.3 }, 1.05);
      }

      return () => timeline.kill();
    },
    { scope: sectionRef, dependencies: [reduce] }
  );

  useGSAP(
    () => {
      // L'ouverture anime les mêmes transformations : la profondeur au scroll
      // ne s'installe qu'une fois la scène posée.
      if (!introDone || reduce || prefersReducedMotion()) return;
      const section = sectionRef.current;
      const backdrop = sceneBackdropRef.current;
      const content = sceneContentRef.current;
      if (!section || !backdrop || !content) return;

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom top",
          scrub: 0.6,
          onUpdate: (self) => {
            section.style.setProperty(
              "--hero-progress",
              self.progress.toFixed(3)
            );
          },
        },
      });

      // Livre pop-up qui se referme : la scène bascule en arrière pendant
      // que la cover se décolle vers le spectateur (`--hero-progress`, CSS).
      timeline
        .to(backdrop, { yPercent: 24, scale: 1.18, ease: "none" }, 0)
        .to(content, { y: 40, opacity: 0, ease: "power1.in" }, 0)
        .fromTo(
          section,
          { rotateX: 0, scale: 1, transformPerspective: 1400, transformOrigin: "50% 100%" },
          { rotateX: 18, scale: 0.92, ease: "none" },
          0
        );

      ScrollTrigger.refresh();

      return () => {
        timeline.scrollTrigger?.kill();
        timeline.kill();
        section.style.removeProperty("--hero-progress");
        if (prefersReducedMotion()) {
          gsap.set([section, backdrop, content], {
            clearProps: "transform,opacity",
          });
        }
      };
    },
    { scope: sectionRef, dependencies: [introDone, reduce] }
  );

  useGSAP(
    () => {
      const layer = backdropLayerRef.current;
      const first = firstBackdrop.current;
      firstBackdrop.current = false;
      if (!layer || first) return;
      if (reduce || prefersReducedMotion()) {
        gsap.set(layer, { opacity: 1 });
        return;
      }
      const tween = gsap.fromTo(
        layer,
        { opacity: 0 },
        { opacity: 1, duration: 0.7, ease: "out" }
      );
      return () => tween.kill();
    },
    { scope: sectionRef, dependencies: [book?.id, reduce] }
  );

  if (total === 0 || !book) return null;

  return (
    <section
      ref={sectionRef}
      data-testid="home-continue-reading"
      data-hero-intro
      className="group grain relative overflow-hidden rounded-2xl"
      aria-roledescription="carousel"
      aria-label={t("home.hero.label")}
      onPointerMove={handleHeroPointerMove}
      onPointerLeave={handleHeroPointerLeave}
    >
      {/* L'artwork courant est la seule source de lumière de l'affiche.
          Chaque changement de tome éteint puis rallume la salle. */}
      <div ref={sceneBackdropRef} className="absolute inset-0">
        {/* Calque de parallaxe à la souris : il déborde pour ne jamais montrer
            ses bords en glissant. */}
        <div ref={parallaxRef} className="absolute -inset-8">
          <div ref={introBackdropRef} data-hero-backdrop className="absolute inset-0">
            {transition ? (
              <div className="absolute inset-0" aria-hidden>
                <ProjectionBackdrop src={transition.from.thumbnailUrl} fadeIn={false} />
              </div>
            ) : null}
            <div
              ref={backdropLayerRef}
              key={`backdrop-${book.id}`}
              className="absolute inset-0"
            >
              <ProjectionBackdrop src={book.thumbnailUrl} fadeIn={false} />
            </div>
          </div>
        </div>
      </div>

      {/* Lumière du projecteur : elle suit le curseur (desktop uniquement). */}
      <div
        ref={glowRef}
        aria-hidden
        className="hero-glow pointer-events-none absolute inset-0 hidden opacity-0 transition-opacity duration-500 group-hover:opacity-100 motion-reduce:hidden md:block"
        style={{
          background:
            "radial-gradient(460px circle at var(--hero-glow-x, 50%) var(--hero-glow-y, 50%), hsl(var(--primary) / 0.16), transparent 68%)",
          mixBlendMode: "screen",
        }}
      />

      {/* Faisceau de projecteur : il balaie la scène à l'ouverture. */}
      <div
        ref={beamRef}
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/3 w-2/3 opacity-0 mix-blend-soft-light will-change-transform dark:mix-blend-screen"
        style={{
          background:
            "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.18) 45%, hsl(var(--primary) / 0.28) 50%, hsl(var(--primary) / 0.18) 55%, transparent)",
          filter: "blur(30px)",
        }}
      />

      <div
        ref={sceneContentRef}
        className="relative overflow-hidden px-5 py-6 sm:px-8 sm:py-9"
      >
        <DirectionalSlide
          activeKey={book.id}
          previousKey={transition?.from.id ?? null}
          previous={
            transition ? (
              <HeroSlide
                key={`previous-${transition.from.id}`}
                book={transition.from}
                series={series}
                staged={false}
                intro={false}
                reduce={reduce}
                onResume={handleResume}
              />
            ) : null
          }
          direction={transition?.direction ?? 1}
          dragOffset={transition?.offset ?? 0}
          reduce={reduce}
          swipeEnabled={hasMany}
          onSwipe={(direction, offset) =>
            goTo(safeIndex + direction, direction, offset)
          }
          onSettled={() => setTransition(null)}
          className={hasMany ? "cursor-grab active:cursor-grabbing" : undefined}
        >
          <HeroSlide
            key={book.id}
            book={book}
            series={series}
            staged={staged}
            intro={staged}
            reduce={reduce}
            onResume={handleResume}
          />
        </DirectionalSlide>

        {(hasMany || hasMore) && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {hasMany && (
              <div
                role="tablist"
                aria-label={t("home.hero.label")}
                className="flex items-center justify-center gap-2"
              >
                {loadedBooks.map((item, position) => (
                  <button
                    key={item.id}
                    role="tab"
                    aria-selected={position === safeIndex}
                    aria-label={`${position + 1} / ${total}`}
                    onClick={() =>
                      goTo(position, position > safeIndex ? 1 : -1)
                    }
                    className={cn(
                      "h-1.5 rounded-full transition-[width,background-color] duration-300 ease-out",
                      position === safeIndex
                        ? "w-8 bg-primary"
                        : "w-2 bg-foreground/25 hover:bg-foreground/45"
                    )}
                  />
                ))}
              </div>
            )}
            {hasMore && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                disabled={isPending}
                aria-busy={isPending}
                className="disabled:opacity-100"
              >
                <LoadMoreLabel
                  pending={isPending}
                  label={t("navigation.loadMore")}
                  loadingLabel={t("navigation.loading")}
                />
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
