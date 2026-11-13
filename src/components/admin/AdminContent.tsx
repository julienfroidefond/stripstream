"use client";

import { useState, useCallback, useEffect } from "react";
import type { AdminStatsData, AdminUserData } from "@/lib/services/admin.service";
import { StatsCards } from "./StatsCards";
import { UsersTable } from "./UsersTable";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { getAdminDashboardData } from "@/app/actions/admin";
import { useTranslate } from "@/hooks/useTranslate";
import { ERROR_CODES } from "@/constants/errorCodes";

interface AdminContentProps {
  initialUsers: AdminUserData[];
  initialStats: AdminStatsData;
}

export function AdminContent({ initialUsers, initialStats }: AdminContentProps) {
  const [users, setUsers] = useState(initialUsers);
  const [stats, setStats] = useState(initialStats);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslate();

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  useEffect(() => {
    setStats(initialStats);
  }, [initialStats]);

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const result = await getAdminDashboardData();

      if (!result.success) {
        toast({
          variant: "destructive",
          title: t("common.error"),
          description: t(`errors.${result.code}`),
        });
        return;
      }

      setUsers(result.users);
      setStats(result.stats);

      toast({
        title: t("admin.refresh.success.title"),
        description: t("admin.refresh.success.description"),
      });
    } catch {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t(`errors.${ERROR_CODES.ADMIN.FETCH_USERS_ERROR}`),
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [toast, t]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Administration</h1>
            <p className="text-muted-foreground mt-2">Gérez les utilisateurs de la plateforme</p>
          </div>
          <Button onClick={refreshData} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Rafraîchir
          </Button>
        </div>

        <StatsCards stats={stats} />

        <div>
          <h2 className="text-2xl font-semibold mb-4">Utilisateurs</h2>
          <UsersTable users={users} onUserUpdated={refreshData} />
        </div>
      </div>
    </div>
  );
}
