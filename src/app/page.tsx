"use client";

export default function Home() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Bienvenue sur Paniels</h1>
        <p className="text-muted-foreground mt-2">
          Votre lecteur Komga moderne pour lire vos BD, mangas et comics préférés.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <h2 className="font-semibold mb-2">Bibliothèques</h2>
          <p className="text-sm text-muted-foreground">
            Accédez à vos bibliothèques Komga et parcourez vos collections.
          </p>
        </div>

        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <h2 className="font-semibold mb-2">Collections</h2>
          <p className="text-sm text-muted-foreground">
            Organisez vos lectures en collections thématiques.
          </p>
        </div>

        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <h2 className="font-semibold mb-2">Lecture</h2>
          <p className="text-sm text-muted-foreground">
            Profitez d'une expérience de lecture fluide et confortable.
          </p>
        </div>
      </div>
    </div>
  );
}
