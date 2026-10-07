"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Calendar, Shield, Heart } from "lucide-react";
import type { UserProfile } from "@/lib/services/user.service";

interface UserProfileCardProps {
  profile: UserProfile & {
    stats: { favoritesCount: number; hasPreferences: boolean; hasKomgaConfig: boolean };
  };
}

export function UserProfileCard({ profile }: UserProfileCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations du compte</CardTitle>
        <CardDescription>Vos informations personnelles</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Mail className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Email</p>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Rôles</p>
            <div className="flex gap-2 mt-1">
              {profile.roles.map((role) => (
                <Badge key={role} variant="secondary">
                  {role.replace("ROLE_", "")}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Membre depuis</p>
            <p className="text-sm text-muted-foreground">
              {new Date(profile.createdAt).toLocaleDateString("fr-FR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Heart className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Favoris</p>
            <p className="text-sm text-muted-foreground">
              {profile.stats.favoritesCount} séries favorites
            </p>
          </div>
        </div>

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Dernière mise à jour: {new Date(profile.updatedAt).toLocaleDateString("fr-FR")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
