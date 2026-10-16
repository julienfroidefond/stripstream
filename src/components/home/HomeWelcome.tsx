"use client";

import { Fragment, useRef } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BookOpenCheck, Cable, LibraryBig, Projector, Server } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectionBackdrop } from "@/components/ui/projection-backdrop";
import { GlowLayer, Magnetic, StaggerGroup, StaggerItem, usePointerGlow } from "@/components/motion";
import { curtainOpen, fadeUp, staggerContainer } from "@/lib/motion";
import { useTranslate } from "@/hooks/useTranslate";

const KOMGA_SETUP_HREF = "/settings?tab=connection&new=komga";
const LIBRARIAN_SETUP_HREF = "/settings?tab=connection&new=stripstream";

/** L'affiche du site : le logo, décliné pour chaque thème. */
const LOGO_LIGHT = "/images/logostripstream-white.png";
const LOGO_DARK = "/images/logostripstream.png";

const STEPS: { key: string; icon: LucideIcon }[] = [
  { key: "step1", icon: Cable },
  { key: "step2", icon: BookOpenCheck },
  { key: "step3", icon: LibraryBig },
];

/**
 * Accueil d'installation : aucun serveur branché, la salle est vide.
 *
 * La page tient lieu d'affiche — le logo du site, fondu dans la surface,
 * éclaire le hero, les trois étapes disent ce que fait StripStream, et les
 * deux cartes mènent directement au formulaire de connexion, type
 * pré-sélectionné.
 */
export function HomeWelcome() {
  const { t } = useTranslate();
  const reduce = useReducedMotion();

  const stagedContent = reduce
    ? {}
    : {
        variants: staggerContainer(0.07, 0.05),
        initial: "hidden" as const,
        animate: "visible" as const,
      };
  const stagedItem = reduce ? {} : { variants: fadeUp };

  return (
    <section data-testid="home-welcome" className="space-y-10 pb-2">
      <motion.section
        className="relative overflow-hidden rounded-2xl bg-surface-1 px-6 py-12 sm:px-12 sm:py-16"
        variants={reduce ? undefined : curtainOpen}
        initial={reduce ? undefined : "hidden"}
        animate={reduce ? undefined : "visible"}
      >
        {/* L'affiche du site : le logo en fond, même travelling que les
            carrousels (flou, pan/zoom, vignette). Une déclinaison par thème,
            la variante masquée n'étant pas rendue par le navigateur. */}
        <ProjectionBackdrop src={LOGO_LIGHT} position="center" className="dark:hidden" />
        <ProjectionBackdrop src={LOGO_DARK} position="center" className="hidden dark:block" />

        <motion.div
          className="relative mx-auto flex max-w-2xl flex-col items-center gap-5 text-center"
          {...stagedContent}
        >
          <motion.p
            {...stagedItem}
            className="inline-flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-muted-foreground"
          >
            <Projector aria-hidden className="h-3.5 w-3.5 text-primary" />
            {t("home.welcome.badge")}
          </motion.p>

          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            <MaskedWords text={t("home.welcome.title")} />
          </h1>

          <motion.p
            {...stagedItem}
            className="text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            {t("home.welcome.subtitle")}
          </motion.p>

          <motion.div
            {...stagedItem}
            className="mt-2 flex flex-col items-center gap-3 sm:flex-row"
          >
            <Magnetic>
              <Button asChild size="lg" data-testid="welcome-connect-komga">
                <Link href={KOMGA_SETUP_HREF}>
                  <Cable aria-hidden className="h-4 w-4" />
                  {t("home.welcome.ctaKomga")}
                </Link>
              </Button>
            </Magnetic>
            <Button asChild size="lg" variant="outline" data-testid="welcome-connect-stripstream">
              <Link href={LIBRARIAN_SETUP_HREF}>
                {t("home.welcome.ctaStripstream")}
                <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            </Button>
          </motion.div>

          <motion.p {...stagedItem} className="text-xs text-muted-foreground">
            {t("home.welcome.reassurance")}
          </motion.p>
        </motion.div>
      </motion.section>

      <StaggerGroup className="grid gap-4 sm:grid-cols-3" stagger={0.1} effect="settle">
        {STEPS.map(({ key, icon: Icon }, index) => (
          <StaggerItem key={key} className="h-full">
            <div className="flex h-full flex-col gap-3 rounded-2xl bg-surface-1 p-5">
              <div className="flex items-center justify-between">
                <span className="font-display text-3xl font-semibold text-primary">
                  {`0${index + 1}`}
                </span>
                <Icon aria-hidden className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <h2 className="font-display text-base font-semibold">
                  {t(`home.welcome.steps.${key}.title`)}
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t(`home.welcome.steps.${key}.description`)}
                </p>
              </div>
            </div>
          </StaggerItem>
        ))}
      </StaggerGroup>

      <div className="space-y-5">
        <div className="space-y-1">
          <h2 className="font-display text-xl font-semibold">
            {t("home.welcome.connections.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("home.welcome.connections.subtitle")}
          </p>
        </div>

        <StaggerGroup className="grid gap-4 md:grid-cols-2" stagger={0.08}>
          <StaggerItem className="h-full">
            <ConnectionCard
              href={KOMGA_SETUP_HREF}
              icon={Server}
              title="Komga"
              badge={t("home.welcome.connections.komga.badge")}
              description={t("home.welcome.connections.komga.description")}
              action={t("home.welcome.connections.action")}
              testId="welcome-card-komga"
            />
          </StaggerItem>
          <StaggerItem className="h-full">
            <ConnectionCard
              href={LIBRARIAN_SETUP_HREF}
              icon={LibraryBig}
              title="Stripstream Librarian"
              badge={t("home.welcome.connections.librarian.badge")}
              description={t("home.welcome.connections.librarian.description")}
              action={t("home.welcome.connections.action")}
              testId="welcome-card-stripstream"
            />
          </StaggerItem>
        </StaggerGroup>
      </div>
    </section>
  );
}

/**
 * Titre d'affiche : chaque mot sort de son masque, l'un après l'autre.
 * Tout est gated en CSS (`motion-safe`) — sans animation ni script, le texte
 * est simplement là, jamais masqué.
 */
function MaskedWords({ text }: { text: string }) {
  const words = text.split(" ");

  return (
    <>
      {words.map((word, index) => (
        <Fragment key={`${word}-${index}`}>
          <span className="inline-block overflow-hidden align-bottom pb-[0.08em] -mb-[0.08em]">
            <span
              className="inline-block motion-safe:animate-mask-rise"
              style={{ animationDelay: `${120 + index * 90}ms` }}
            >
              {word}
            </span>
          </span>
          {index < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </>
  );
}

interface ConnectionCardProps {
  href: string;
  icon: LucideIcon;
  title: string;
  badge: string;
  description: string;
  action: string;
  testId: string;
}

function ConnectionCard({
  href,
  icon: Icon,
  title,
  badge,
  description,
  action,
  testId,
}: ConnectionCardProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const handleGlow = usePointerGlow(ref);

  return (
    <Link
      ref={ref}
      href={href}
      data-testid={testId}
      onMouseMove={handleGlow}
      className="group relative flex h-full flex-col gap-4 overflow-hidden rounded-2xl bg-surface-1 p-6 ring-1 ring-border/60 transition-colors duration-300 hover:bg-surface-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
    >
      <GlowLayer />
      <div className="relative flex items-center justify-between gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2 text-primary transition-colors duration-300 group-hover:bg-surface-3">
          <Icon aria-hidden className="h-5 w-5" />
        </span>
        <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {badge}
        </span>
      </div>
      <div className="relative space-y-1.5">
        <h3 className="font-display text-lg font-semibold">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <span className="relative mt-auto inline-flex items-center gap-1.5 pt-1 text-sm font-medium text-primary">
        {action}
        <ArrowRight
          aria-hidden
          className="h-4 w-4 transition-transform duration-300 ease-out group-hover:translate-x-1"
        />
      </span>
    </Link>
  );
}
