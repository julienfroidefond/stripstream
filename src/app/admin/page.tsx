import { AdminService } from "@/lib/services/admin.service";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth/session";
import { AdminContent } from "@/components/admin/AdminContent";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import logger from "@/lib/logger";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // Gate hors du `try` : `redirect()` lève une exception de contrôle que le
  // `catch` ci-dessous ne doit ni avaler ni journaliser comme une panne.
  if (!(await isAdmin())) {
    redirect("/");
  }

  try {
    const [users, stats] = await Promise.all([
      AdminService.getAllUsers(),
      AdminService.getUserStats(),
    ]);

    return <AdminContent initialUsers={users} initialStats={stats} />;
  } catch (error) {
    logger.error({ err: error }, "Erreur lors du chargement de la page admin");
    const code = error instanceof AppError ? error.code : ERROR_CODES.ADMIN.FETCH_USERS_ERROR;

    return (
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <ErrorMessage errorCode={code} />
        </div>
      </main>
    );
  }
}
