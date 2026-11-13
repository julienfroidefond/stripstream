"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Calendar, Shield, Heart } from "lucide-react";
import type { UserProfile } from "@/lib/services/user.service";
import { useTranslate } from "@/hooks/useTranslate";
import { formatLocaleDate } from "@/lib/utils";

interface UserProfileCardProps {
  profile: UserProfile & {
    stats: { favoritesCount: number; hasPreferences: boolean; hasConnection: boolean };
  };
}

export function UserProfileCard({ profile }: UserProfileCardProps) {
  const { t, currentLanguage } = useTranslate();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("account.profile.title")}</CardTitle>
        <CardDescription>{t("account.profile.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Mail className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{t("account.profile.email")}</p>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{t("account.profile.roles")}</p>
            <div className="flex gap-2 mt-1">
              {profile.roles.map((role) => (
                <Badge key={role} variant="secondary">
                  {t(`admin.roles.${role}`)}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{t("account.profile.memberSince")}</p>
            <p className="text-sm text-muted-foreground">
              {formatLocaleDate(profile.createdAt, currentLanguage, {
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
            <p className="text-sm font-medium">{t("account.profile.favorites")}</p>
            <p className="text-sm text-muted-foreground">
              {t("account.profile.favoritesCount", { count: profile.stats.favoritesCount })}
            </p>
          </div>
        </div>

        <div className="pt-4">
          <p className="text-xs text-muted-foreground">
            {t("account.profile.lastUpdate", {
              date: formatLocaleDate(profile.updatedAt, currentLanguage),
            })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
