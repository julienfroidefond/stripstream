"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { useTranslate } from "@/hooks/useTranslate";
import { ERROR_CODES } from "@/constants/errorCodes";
import type { AdminUserData } from "@/lib/services/admin.service";
import { deleteUser } from "@/app/actions/admin";

interface DeleteUserDialogProps {
  user: AdminUserData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteUserDialog({ user, open, onOpenChange, onSuccess }: DeleteUserDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslate();

  const showError = (code: string) =>
    toast({
      variant: "destructive",
      title: t("common.error"),
      description: t(`errors.${code}`),
    });

  const handleDelete = async () => {
    setIsLoading(true);

    try {
      const result = await deleteUser(user.id);

      if (!result.success) {
        showError(result.code);
        setIsLoading(false);
        return;
      }

      toast({
        title: t("common.success"),
        description: t("admin.deleteUser.success"),
      });

      onSuccess();
    } catch {
      showError(ERROR_CODES.ADMIN.DELETE_USER_ERROR);
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("admin.deleteUser.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("admin.deleteUser.intro")} <strong>{user.email}</strong>.
            <br />
            {t("admin.deleteUser.irreversible")}
            <ul className="list-disc list-inside mt-2">
              <li>{t("admin.deleteUser.komga")}</li>
              <li>{t("admin.deleteUser.preferences")}</li>
              <li>{t("admin.deleteUser.favorites", { count: user._count?.favorites || 0 })}</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? t("admin.deleteUser.deleting") : t("admin.deleteUser.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
