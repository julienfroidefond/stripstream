"use client";

import { useRef } from "react";
import { LogIn, UserPlus } from "lucide-react";
import LanguageSelector from "@/components/LanguageSelector";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useTranslate } from "@/hooks/useTranslate";
import { gsap, prefersReducedMotion, useGsapEffect } from "@/lib/gsap";

/**
 * Le logo du site, décliné pour chaque thème.
 *
 * Variantes détourées : la marque se pose sur le fond de la page (couleur du
 * thème + grain) sans le carré opaque des visuels PWA, qui ne peut pas
 * coïncider avec elle.
 */
const LOGO_LIGHT = "/images/logo-mark-light.png";
const LOGO_DARK = "/images/logo-mark-dark.png";

interface LoginContentProps {
  searchParams: {
    from?: string;
    tab?: string;
  };
}

/**
 * Entrée de la salle : une seule composition, sans visuel latéral.
 *
 * La typographie porte l'affiche à gauche, la carte d'accès se pose à droite.
 * Sur téléphone, la carte passe sous le titre et la page défile naturellement.
 * L'entrée reprend le relief GSAP de l'accueil, états de départ en CSS
 * (`[data-login]`) pour éviter tout saut avant hydratation.
 */
export function LoginContent({ searchParams }: LoginContentProps) {
  const { t } = useTranslate();
  const defaultTab = searchParams.tab === "register" ? "register" : "login";
  const rootRef = useRef<HTMLDivElement>(null);

  useGsapEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const parts = Array.from(root.querySelectorAll<HTMLElement>("[data-login]"));
    const settle = () => {
      parts.forEach((part) => part.removeAttribute("data-login"));
      gsap.set(parts, { clearProps: "opacity,transform" });
    };
    if (prefersReducedMotion()) {
      settle();
      return;
    }

    const from: Record<string, gsap.TweenVars> = {
      fade: { opacity: 0 },
      brand: { opacity: 0, y: -20 },
      quote: { opacity: 0, y: 24 },
      panel: { opacity: 0, x: 40, rotateY: -14, transformPerspective: 1200 },
      title: { opacity: 0, yPercent: 60, rotateX: -80, transformPerspective: 600 },
    };
    const at: Record<string, number> = {
      panel: 0,
      fade: 0.05,
      brand: 0.12,
      title: 0.22,
      quote: 0.3,
    };
    const timeline = gsap.timeline({ defaults: { ease: "projection" }, onComplete: settle });
    parts.forEach((part) => {
      const kind = part.dataset.login ?? "fade";
      timeline.fromTo(
        part,
        from[kind] ?? from.fade,
        {
          opacity: 1,
          x: 0,
          y: 0,
          yPercent: 0,
          scale: 1,
          rotateX: 0,
          rotateY: 0,
          duration: kind === "title" ? 0.7 : 0.6,
          ease: kind === "title" ? "back.out(1.8)" : "focus",
        },
        at[kind] ?? 0
      );
    });
    return () => timeline.kill();
  });

  return (
    <div ref={rootRef} className="relative flex min-h-dvh flex-col overflow-x-clip">
      <header className="mx-auto flex h-16 w-full max-w-6xl shrink-0 items-center justify-between gap-4 px-4 sm:h-20 sm:px-8">
        <div data-login="brand" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LOGO_DARK}
            alt=""
            className="hidden h-9 w-9 object-contain dark:block"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LOGO_LIGHT}
            alt=""
            className="h-9 w-9 object-contain dark:hidden"
          />
          <span className="inline-flex flex-col leading-none">
            <span className="font-display text-base font-bold tracking-[0.06em] text-foreground sm:text-lg sm:tracking-[0.08em]">
              Strip<span className="text-primary">Stream</span>
            </span>
            <span className="mt-1 hidden text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground sm:inline">
              comic reader
            </span>
          </span>
        </div>

        <div data-login="fade" className="flex items-center gap-1">
          <ThemeToggle />
          <LanguageSelector />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 items-start px-4 pb-12 pt-6 sm:px-8 sm:pb-16 lg:items-center lg:py-12">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:gap-20">
          <section className="max-w-xl">
            <p
              data-login="fade"
              className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.28em] text-primary"
            >
              <span aria-hidden className="h-px w-8 bg-primary/60" />
              {t("login.eyebrow")}
            </p>

            <h1
              data-login="title"
              className="mt-5 font-display text-4xl font-semibold leading-[0.98] tracking-[-0.045em] sm:text-5xl lg:text-6xl"
            >
              {t("login.title")}
            </h1>

            <p
              data-login="quote"
              className="mt-5 hidden max-w-md text-base leading-relaxed text-muted-foreground sm:block sm:text-lg"
            >
              {t("login.description")}
            </p>

            <p
              data-login="quote"
              className="mt-8 hidden items-center gap-3 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground/80 sm:flex"
            >
              <span aria-hidden className="h-px w-8 bg-border" />
              Komga <span className="text-primary/70">·</span> Stripstream Librarian
            </p>
          </section>

          <div
            data-login="panel"
            className="w-full max-w-[440px] justify-self-center lg:justify-self-end"
          >
            <div className="rounded-2xl bg-surface-1 p-5 ring-1 ring-border/70 sm:p-7">
              <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
                {t("login.subtitle")}
              </p>

              <Tabs defaultValue={defaultTab} className="w-full">
                <TabsList className="grid h-11 w-full grid-cols-2 rounded-xl bg-surface-2 p-1">
                  <TabsTrigger value="login" className="gap-2 rounded-lg py-2">
                    <LogIn aria-hidden className="h-4 w-4" />
                    {t("login.tabs.login")}
                  </TabsTrigger>
                  <TabsTrigger value="register" className="gap-2 rounded-lg py-2">
                    <UserPlus aria-hidden className="h-4 w-4" />
                    {t("login.tabs.register")}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-5">
                  <LoginForm from={searchParams.from} />
                </TabsContent>
                <TabsContent value="register" className="mt-5">
                  <RegisterForm from={searchParams.from} />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
