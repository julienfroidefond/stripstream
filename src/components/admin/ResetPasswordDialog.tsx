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
          <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
          <DialogDescription>
            Définir un nouveau mot de passe pour <strong>{user.email}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nouveau mot de passe</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pl-9"
                placeholder="Minimum 8 caractères"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-9"
                placeholder="Confirmer le nouveau mot de passe"
                disabled={isLoading}
              />
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Le mot de passe doit contenir au moins 8 caractères, une majuscule et un chiffre.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Réinitialisation..." : "Réinitialiser"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
