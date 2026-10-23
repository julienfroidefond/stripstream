"use client";

import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslate } from "@/hooks/useTranslate";
import LanguageSelector from "@/components/LanguageSelector";
import { useRef } from "react";
import { gsap, prefersReducedMotion, useGsapEffect } from "@/lib/gsap";

interface LoginContentProps {
  searchParams: {
    from?: string;
    tab?: string;
  };
}

export function LoginContent({ searchParams }: LoginContentProps) {
  const { t } = useTranslate();
  const defaultTab = searchParams.tab || "login";
  const rootRef = useRef<HTMLDivElement>(null);

  /**
   * Entrée de l'écran de connexion, même relief que l'accueil : l'affiche
   * glisse en place, le panneau du formulaire pivote vers le spectateur et
   * le logo se pose en rebondissant. États de départ en CSS (`[data-login]`).
   */
  useGsapEffect(
    () => {
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
        logo: { opacity: 0, scale: 1.8 },
        title: { opacity: 0, yPercent: 60, rotateX: -80, transformPerspective: 600 },
      };
      const at: Record<string, number> = {
        panel: 0,
        fade: 0.05,
        logo: 0.1,
        brand: 0.15,
        title: 0.25,
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
            duration: kind === "logo" ? 0.7 : 0.6,
            ease: kind === "logo" || kind === "title" ? "back.out(1.8)" : "focus",
          },
          at[kind] ?? 0
        );
      });
      return () => timeline.kill();
    }
  );

  return (
    <div ref={rootRef} className="relative grid min-h-dvh lg:grid-cols-2">
      <div
        data-login="fade"
        className="absolute top-4 right-4 z-50 transition-transform hover:scale-105"
      >
        <LanguageSelector />
      </div>

      <div className="relative hidden h-full flex-col overflow-hidden bg-[hsl(30_7%_4%)] p-10 text-white lg:flex">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 transition-opacity duration-700 ease-out hover:opacity-50"
          style={{
            backgroundImage: "url('/images/login-bg.jpg')",
          }}
        />
        <div className="absolute inset-0 bg-linear-to-b from-black/20 via-black/50 to-black/90" />{/* taste-skill-ignore: scrim neutre au-dessus de l'image de fond */}
        <div data-login="brand" className="relative z-20 flex items-center text-lg font-medium">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logostripstream.png"
            alt="StripStream Logo"
            className="mr-3 hidden h-9 w-9 rounded-md object-cover dark:block transition-transform duration-300 ease-out hover:-rotate-3 hover:scale-108 motion-reduce:transition-none"
            />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logostripstream-white.png"
            alt="StripStream Logo"
            className="mr-3 h-9 w-9 rounded-md object-cover dark:hidden transition-transform duration-300 ease-out hover:-rotate-3 hover:scale-108 motion-reduce:transition-none"
            />
          <span className="font-display text-2xl font-bold tracking-tight">
            Strip<span className="text-primary">Stream</span>
          </span>
        </div>
        <div data-login="quote" className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-xl font-light leading-relaxed tracking-wide text-white/80">
              {t("login.description")}
            </p>
          </blockquote>
        </div>
      </div>

      <div data-login="panel" className="flex items-center justify-center p-6 lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-surface-2 ring-1 ring-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/logostripstream.png"
                alt="StripStream Logo"
                data-login="logo"
                className="hidden h-full w-full object-cover dark:block transition-transform duration-300 ease-out hover:scale-105 motion-reduce:transition-none"
                />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/logostripstream-white.png"
                alt="StripStream Logo"
                data-login="logo"
                className="h-full w-full object-cover dark:hidden transition-transform duration-300 ease-out hover:scale-105 motion-reduce:transition-none"
                />
            </div>
            <h1 data-login="title" className="font-display text-3xl font-bold tracking-tight">
              {t("login.title")}
            </h1>
            <p className="text-sm text-muted-foreground">{t("login.subtitle")}</p>
          </div>
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t("login.tabs.login")}</TabsTrigger>
              <TabsTrigger value="register">{t("login.tabs.register")}</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="mt-6">
              <LoginForm from={searchParams.from} />
            </TabsContent>
            <TabsContent value="register" className="mt-6">
              <RegisterForm from={searchParams.from} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
