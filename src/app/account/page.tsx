import { UserProfileCard } from "@/components/account/UserProfileCard";
import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";
import { ReadingStatsCard } from "@/components/account/ReadingStatsCard";
import { UserService } from "@/lib/services/user.service";
import { getReadingStats } from "@/lib/services/reading-stats.service";
import { redirect } from "next/navigation";
import logger from "@/lib/logger";
import { StaggerGroup, StaggerItem } from "@/components/motion";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  try {
    const [profile, stats, readingStats] = await Promise.all([
      UserService.getUserProfile(),
      UserService.getUserStats(),
      getReadingStats(),
    ]);

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Mon compte</h1>
            <p className="text-muted-foreground mt-2">
              Gérez vos informations personnelles et votre sécurité
            </p>
          </div>

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
    logger.error({ err: error }, "Erreur lors du chargement du compte:");
    redirect("/login");
  }
}
