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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useTranslate } from "@/hooks/useTranslate";
import { ERROR_CODES } from "@/constants/errorCodes";
import type { AdminUserData } from "@/lib/services/admin.service";
import { updateUserRoles } from "@/app/actions/admin";

interface EditUserDialogProps {
  user: AdminUserData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const AVAILABLE_ROLES = [
  { value: "ROLE_USER", label: "User" },
  { value: "ROLE_ADMIN", label: "Admin" },
];

export function EditUserDialog({ user, open, onOpenChange, onSuccess }: EditUserDialogProps) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>(user.roles);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslate();

  const showError = (code: string) =>
    toast({
      variant: "destructive",
      title: t("common.error"),
      description: t(`errors.${code}`),
    });

  const handleRoleToggle = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSubmit = async () => {
    if (selectedRoles.length === 0) {
      showError(ERROR_CODES.ADMIN.INVALID_ROLES);
      return;
    }

    setIsLoading(true);

    try {
      const result = await updateUserRoles(user.id, selectedRoles);

      if (!result.success) {
        showError(result.code);
        return;
      }

      toast({
        title: t("common.success"),
        description: t("admin.editUser.success"),
      });

      onSuccess();
    } catch {
      showError(ERROR_CODES.ADMIN.UPDATE_USER_ERROR);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier l&apos;utilisateur</DialogTitle>
          <DialogDescription>
            Gérer les rôles de <strong>{user.email}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Rôles</Label>
            {AVAILABLE_ROLES.map((role) => (
              <div key={role.value} className="flex items-center space-x-2">
                <Checkbox
                  id={role.value}
                  checked={selectedRoles.includes(role.value)}
                  onCheckedChange={() => handleRoleToggle(role.value)}
                  disabled={isLoading}
                />
                <Label htmlFor={role.value} className="font-normal cursor-pointer">
                  {role.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
