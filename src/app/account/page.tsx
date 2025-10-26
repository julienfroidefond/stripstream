import { UserProfileCard } from "@/components/account/UserProfileCard";
import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";
import { UserService } from "@/lib/services/user.service";
import { redirect } from "next/navigation";
import logger from "@/lib/logger";

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  try {
    const [profile, stats] = await Promise.all([
      UserService.getUserProfile(),
      UserService.getUserStats(),
    ]);

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Mon compte</h1>
            <p className="text-muted-foreground mt-2">
              Gérez vos informations personnelles et votre sécurité
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <UserProfileCard profile={{ ...profile, stats }} />
            <ChangePasswordForm />
          </div>
        </div>
      </div>
    );
  } catch (error) {
    logger.error({ err: error }, "Erreur lors du chargement du compte:");
    redirect("/login");
  }
}
