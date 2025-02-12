"use client";

import { HomeContent } from "@/components/home/HomeContent";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { KomgaBook, KomgaSeries } from "@/types/komga";
import { useToast } from "@/components/ui/use-toast";

interface HomeData {
  ongoing: KomgaSeries[];
  recentlyRead: KomgaBook[];
  onDeck: KomgaBook[];
}

export default function HomePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<HomeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const response = await fetch("/api/komga/home");
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Erreur ${response.status}`);
        }

        const jsonData = await response.json();
        setData({
          ongoing: jsonData.ongoing || [],
          recentlyRead: jsonData.recentlyRead || [],
          onDeck: jsonData.onDeck || [],
        });
      } catch (error) {
        console.error("Erreur lors de la récupération des données:", error);
        const errorMessage = error instanceof Error ? error.message : "Une erreur est survenue";
        setError(errorMessage);

        // Si l'erreur indique une configuration manquante, rediriger vers les préférences
        if (errorMessage.includes("Configuration Komga manquante")) {
          toast({
            title: "Configuration requise",
            description: "Veuillez configurer votre serveur Komga pour continuer",
            variant: "destructive",
          });
          router.push("/settings");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchHomeData();
  }, [router, toast]);

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-8 space-y-12">
        <div className="h-[500px] -mx-4 sm:-mx-8 lg:-mx-14 bg-muted animate-pulse" />
        <div className="space-y-12">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-4">
              <div className="h-8 w-48 bg-muted rounded animate-pulse" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {[...Array(6)].map((_, j) => (
                  <div key={j} className="aspect-[2/3] bg-muted rounded animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="rounded-md bg-destructive/15 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </main>
    );
  }

  return data ? <HomeContent data={data} /> : null;
}
