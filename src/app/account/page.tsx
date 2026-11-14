import { AccountHeader } from "@/components/account/AccountHeader";
import { UserProfileCard } from "@/components/account/UserProfileCard";
import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";
import { ReadingStatsCard } from "@/components/account/ReadingStatsCard";
import { UserService } from "@/lib/services/user.service";
import { getReadingStats } from "@/lib/services/reading-stats.service";
import { redirect } from "next/navigation";
import logger from "@/lib/logger";
import { getCurrentUserId } from "@/lib/auth/session";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import { StaggerGroup, StaggerItem } from "@/components/motion";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  // Seule l'absence de session renvoie vers /login ; une panne (base, stats)
  // s'affiche sur place au lieu de déconnecter l'utilisateur.
  // La page est le point d'entrée : elle lit la session une fois et passe
  // l'identité aux services (ADR 0029).
  const userId = await getCurrentUserId();
  if (userId === null) {
    redirect("/login");
  }

  try {
    const [profile, stats, readingStats] = await Promise.all([
      UserService.getUserProfile(userId),
      UserService.getUserStats(userId),
      getReadingStats(),
    ]);

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl space-y-8">
          <AccountHeader />

          <StaggerGroup className="grid gap-6 md:grid-cols-2" effect="settle" stagger={0.08}>
            <StaggerItem className="h-full">
              <UserProfileCard profile={{ ...profile, stats }} />
            </StaggerItem>
            <StaggerItem className="h-full">
              <ChangePasswordForm username={profile.email} />
            </StaggerItem>
          </StaggerGroup>

          <StaggerGroup effect="settle">
            <StaggerItem>
              <ReadingStatsCard stats={readingStats} />
            </StaggerItem>
          </StaggerGroup>
        </div>
      </div>
    );
  } catch (error) {
    logger.error({ err: error }, "Erreur lors du chargement du compte");
    const code = error instanceof AppError ? error.code : ERROR_CODES.AUTH.FETCH_ERROR;

    return (
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <ErrorMessage errorCode={code} />
        </div>
      </main>
    );
  }
}
