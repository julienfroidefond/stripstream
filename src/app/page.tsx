import { HomeContent } from "@/components/home/HomeContent";
import { HomeService } from "@/lib/services/home.service";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { withPageTiming } from "@/lib/hoc/withPageTiming";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { ERROR_CODES } from "@/constants/errorCodes";
import { HomeData } from "@/lib/services/home.service";
import { AppError } from "@/utils/errors";

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
    if (error instanceof AppError && error.code === ERROR_CODES.KOMGA.MISSING_CONFIG) {
      redirect("/settings");
    }

    return (
      <main className="container mx-auto px-4 py-8">
        <ErrorMessage error={error as Error} errorCode="HOME_FETCH_ERROR" />
      </main>
    );
  }
}

export default withPageTiming("HomePage", HomePage);
