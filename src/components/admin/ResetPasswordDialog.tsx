"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useTranslate } from "@/hooks/useTranslate";
import { ERROR_CODES } from "@/constants/errorCodes";
import { Lock } from "lucide-react";
import type { AdminUserData } from "@/lib/services/admin.service";
import { resetUserPassword } from "@/app/actions/admin";

interface ResetPasswordDialogProps {
  user: AdminUserData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ResetPasswordDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: ResetPasswordDialogProps) {
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

  const handleSubmit = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("admin.resetPassword.missingFields"),
      });
      return;
    }

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
      const result = await resetUserPassword(user.id, newPassword);

      if (!result.success) {
        showError(result.code);
        return;
      }

      toast({
        title: t("common.success"),
        description: t("admin.resetPassword.success"),
      });

      setNewPassword("");
      setConfirmPassword("");
      onSuccess();
    } catch {
      showError(ERROR_CODES.ADMIN.RESET_PASSWORD_ERROR);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setNewPassword("");
      setConfirmPassword("");
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin.resetPassword.title")}</DialogTitle>
          <DialogDescription>
            {t("admin.resetPassword.description")} <strong>{user.email}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">{t("admin.resetPassword.new")}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pl-9"
                placeholder={t("admin.resetPassword.newPlaceholder")}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t("admin.resetPassword.confirm")}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-9"
                placeholder={t("admin.resetPassword.confirmPlaceholder")}
                disabled={isLoading}
              />
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {t("admin.resetPassword.rules")}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? t("admin.resetPassword.submitting") : t("admin.resetPassword.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
