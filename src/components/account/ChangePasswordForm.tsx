"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Lock } from "lucide-react";
import { changePassword } from "@/app/actions/password";
import { useTranslate } from "@/hooks/useTranslate";
import { ERROR_CODES } from "@/constants/errorCodes";

interface ChangePasswordFormProps {
  username?: string;
}

export function ChangePasswordForm({ username }: ChangePasswordFormProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslate();

  const showError = (code: string) =>
    toast({
      variant: "destructive",
      title: t("common.error"),
      description: t(`errors.${code}`),
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      showError(ERROR_CODES.AUTH.PASSWORD_MISMATCH);
      return;
    }

    if (newPassword.length < 8) {
      showError(ERROR_CODES.AUTH.PASSWORD_TOO_SHORT);
      return;
    }

    setIsLoading(true);

    try {
      const result = await changePassword(currentPassword, newPassword);

      if (!result.success) {
        showError(result.code);
        return;
      }

      toast({
        title: t("common.success"),
        description: t("account.changePassword.success"),
      });

      // Reset form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      showError(ERROR_CODES.AUTH.PASSWORD_CHANGE_ERROR);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("account.changePassword.title")}</CardTitle>
        <CardDescription>{t("account.changePassword.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            name="username"
            autoComplete="username"
            value={username || ""}
            readOnly
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only"
          />

          <div className="space-y-2">
            <Label htmlFor="currentPassword">{t("account.changePassword.current")}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="pl-9"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">{t("account.changePassword.new")}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pl-9"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t("account.changePassword.confirm")}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-9"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? t("account.changePassword.submitting") : t("account.changePassword.submit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
