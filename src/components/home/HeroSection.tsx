"use client";

import { KomgaSeries } from "@/types/komga";
import Image from "next/image";
import { useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageLoader } from "@/components/ui/image-loader";

interface HeroSectionProps {
  series: KomgaSeries[];
}

export function HeroSection({ series }: HeroSectionProps) {
  // console.log("HeroSection - Séries reçues:", {
  //   count: series?.length || 0,
  //   firstSeries: series?.[0],
  // });

  return (
    <div className="relative h-[500px] -mx-4 sm:-mx-8 lg:-mx-14 overflow-hidden">
      {/* Grille de couvertures en arrière-plan */}
      <div className="absolute inset-0 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4 opacity-10">
        {series?.map((series) => (
          <CoverImage key={series.id} series={series} />
        ))}
      </div>

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/50 to-background" />

      {/* Contenu */}
      <div className="relative h-full container flex flex-col items-center justify-center text-center space-y-4">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
          Bienvenue sur StripStream
        </h1>
        <p className="text-xl text-muted-foreground max-w-[600px]">
          Votre bibliothèque numérique pour lire vos BD, mangas et comics préférés.
        </p>
      </div>
    </div>
  );
}

interface CoverImageProps {
  series: KomgaSeries;
}

function CoverImage({ series }: CoverImageProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  return (
    <div className="relative aspect-[2/3] bg-muted rounded-lg overflow-hidden">
      {!imageError ? (
        <>
          <ImageLoader isLoading={imageLoading} />
          <Image
            src={`/api/komga/images/series/${series.id}/thumbnail`}
            alt={`Couverture de ${series.metadata.title}`}
            fill
            className={cn(
              "object-cover transition-opacity duration-300",
              imageLoading ? "opacity-0" : "opacity-100"
            )}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16.666vw"
            loading="lazy"
            quality={25}
            onError={() => setImageError(true)}
            onLoad={() => setImageLoading(false)}
          />
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <ImageOff className="w-8 h-8" />
        </div>
      )}
    </div>
  );
}
