import { HomeContent } from "@/components/home/HomeContent";
import { HomeService } from "@/lib/services/home.service";
import { cookies } from "next/headers";
import { komgaConfigService } from "@/lib/services/komga-config.service";
import { redirect } from "next/navigation";

export default async function HomePage() {
  try {
    const data = await HomeService.getHomeData();

    return <HomeContent data={data} />;
  } catch (error) {
    // Si l'erreur indique une configuration manquante, rediriger vers les préférences
    if (error instanceof Error && error.message.includes("Configuration Komga manquante")) {
      redirect("/settings");
    }

    return (
      <main className="container mx-auto px-4 py-8">
        <div className="rounded-md bg-destructive/15 p-4">
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : "Une erreur est survenue"}
          </p>
        </div>
      </main>
    );
  }
}
