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
    <div className="container flex flex-col items-center justify-center min-h-[calc(100vh-theme(spacing.14))] space-y-4 text-center">
      <h1 className="text-4xl font-bold">404 - Page non trouvée</h1>
      <p className="text-muted-foreground max-w-[600px]">
        Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Retour à l'accueil
      </Link>
    </div>
  );
}
