import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page non trouvée - StripStream",
  description: "La page que vous recherchez n'existe pas ou a été déplacée.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return (
    <div className="container flex flex-col items-center justify-center min-h-[calc(100dvh-theme(spacing.14))] space-y-6 text-center">
      <h1 className="font-display text-5xl font-semibold tracking-tight motion-safe:animate-rise-in">
        404 — Page non trouvée
      </h1>
      <p
        className="max-w-[600px] text-pretty text-muted-foreground motion-safe:animate-rise-in"
        style={{ animationDelay: "120ms" }}
      >
        Désolé, la page que vous recherchez n&apos;existe pas ou a été déplacée.
      </p>
      <Link
        href="/"
        style={{ animationDelay: "220ms" }}
        className="motion-safe:animate-rise-in inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
