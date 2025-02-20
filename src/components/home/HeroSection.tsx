import { Cover } from "@/components/ui/cover";

interface OptimizedHeroSeries {
  id: string;
  metadata: {
    title: string;
  };
}

interface HeroSectionProps {
  series: OptimizedHeroSeries[];
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
          <div
            key={series.id}
            className="relative aspect-[2/3] bg-muted rounded-lg overflow-hidden"
          >
            <Cover
              type="series"
              id={series.id}
              alt={`Couverture de ${series.metadata.title}`}
              quality={25}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16.666vw"
            />
          </div>
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
