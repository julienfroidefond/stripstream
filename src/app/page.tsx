import { HomeService } from "@/lib/services/home.service";
import { HomeContent } from "@/components/home/HomeContent";
import { HomeClientWrapper } from "@/components/home/HomeClientWrapper";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import { redirect } from "next/navigation";

export default async function HomePage() {
  try {
    const data = await HomeService.getHomeData();

    return (
      <HomeClientWrapper>
        <HomeContent data={data} />
      </HomeClientWrapper>
    );
  } catch (error) {
    // Si la config Komga est manquante, rediriger vers les settings
    if (error instanceof AppError && error.code === ERROR_CODES.KOMGA.MISSING_CONFIG) {
      redirect("/settings");
    }

    // Afficher une erreur pour les autres cas
    const errorCode = error instanceof AppError ? error.code : ERROR_CODES.KOMGA.SERVER_UNREACHABLE;

    return (
      <main className="container mx-auto px-4 py-8">
        <ErrorMessage errorCode={errorCode} />
      </main>
    );
  }
}
