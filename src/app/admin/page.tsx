import { AdminService } from "@/lib/services/admin.service";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth-utils";
import { AdminContent } from "@/components/admin/AdminContent";

export default async function AdminPage() {
  try {
    const hasAdminAccess = await isAdmin();
    
    if (!hasAdminAccess) {
      redirect("/");
    }

    const [users, stats] = await Promise.all([
      AdminService.getAllUsers(),
      AdminService.getUserStats(),
    ]);

    return <AdminContent initialUsers={users} initialStats={stats} />;
  } catch (error) {
    console.error("Erreur lors du chargement de la page admin:", error);
    redirect("/");
  }
}
