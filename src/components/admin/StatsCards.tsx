"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Shield, Settings, Bookmark } from "lucide-react";
import { CountUp, StaggerGroup, StaggerItem } from "@/components/motion";

interface StatsCardsProps {
  stats: {
    totalUsers: number;
    totalAdmins: number;
    usersWithKomga: number;
    usersWithPreferences: number;
  };
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: "Utilisateurs totaux",
      value: stats.totalUsers,
      icon: Users,
      description: "Comptes enregistrés",
    },
    {
      title: "Administrateurs",
      value: stats.totalAdmins,
      icon: Shield,
      description: "Avec privilèges admin",
    },
    {
      title: "Config Komga",
      value: stats.usersWithKomga,
      icon: Bookmark,
      description: "Utilisateurs configurés",
    },
    {
      title: "Préférences",
      value: stats.usersWithPreferences,
      icon: Settings,
      description: "Préférences personnalisées",
    },
  ];

  return (
    <StaggerGroup
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      effect="settle"
      stagger={0.07}
    >
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <StaggerItem key={card.title} className="h-full">
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">
                  <CountUp value={card.value} />
                </div>
                <p className="text-xs text-muted-foreground">{card.description}</p>
              </CardContent>
            </Card>
          </StaggerItem>
        );
      })}
    </StaggerGroup>
  );
}
