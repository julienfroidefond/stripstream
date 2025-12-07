"use client";

import { useState, useCallback } from "react";
import type { AdminUserData } from "@/lib/services/admin.service";
import { StatsCards } from "./StatsCards";
import { UsersTable } from "./UsersTable";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface AdminContentProps {
  initialUsers: AdminUserData[];
  initialStats: {
    totalUsers: number;
    totalAdmins: number;
    usersWithKomga: number;
    usersWithPreferences: number;
  };
}

export function AdminContent({ initialUsers, initialStats }: AdminContentProps) {
  const [users, setUsers] = useState(initialUsers);
  const [stats, setStats] = useState(initialStats);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [usersResponse, statsResponse] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/stats"),
      ]);

      if (!usersResponse.ok || !statsResponse.ok) {
        throw new Error("Erreur lors du rafraîchissement");
      }

      const [newUsers, newStats] = await Promise.all([usersResponse.json(), statsResponse.json()]);

      setUsers(newUsers);
      setStats(newStats);

      toast({
        title: "Données rafraîchies",
        description: "Les données ont été mises à jour",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de rafraîchir les données",
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [toast]);

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
