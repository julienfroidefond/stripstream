import { HomeContent } from "@/components/home/HomeContent";
import { HomeService } from "@/lib/services/home.service";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { withPageTiming } from "@/lib/hoc/withPageTiming";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { HomeData } from "@/lib/services/home.service";
import { ERROR_CODES } from "@/constants/errorCodes";
async function refreshHome() {
  "use server";

  try {
    await HomeService.invalidateHomeCache();
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Erreur lors du rafraîchissement:", error);
    return { success: false, error: "Erreur lors du rafraîchissement de la page d'accueil" };
  }
}

async function HomePage() {
  try {
    const data: HomeData = await HomeService.getHomeData();

    return <HomeContent data={data} refreshHome={refreshHome} />;
  } catch (error) {
    // Si l'erreur indique une configuration manquante, rediriger vers les préférences
    if (error instanceof Error && error.message.includes("Configuration Komga non trouvée")) {
      redirect("/settings");
    }

    return (
      <main className="container mx-auto px-4 py-8">
        <ErrorMessage errorCode="HOME_FETCH_ERROR" />
      </main>
    );
  }
}

export default withPageTiming("HomePage", HomePage);
