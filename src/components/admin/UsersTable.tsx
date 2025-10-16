"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Check, X, KeyRound } from "lucide-react";
import type { AdminUserData } from "@/lib/services/admin.service";
import { EditUserDialog } from "./EditUserDialog";
import { DeleteUserDialog } from "./DeleteUserDialog";
import { ResetPasswordDialog } from "./ResetPasswordDialog";

interface UsersTableProps {
  users: AdminUserData[];
  onUserUpdated: () => void;
}

export function UsersTable({ users, onUserUpdated }: UsersTableProps) {
  const [editingUser, setEditingUser] = useState<AdminUserData | null>(null);
  const [deletingUser, setDeletingUser] = useState<AdminUserData | null>(null);
  const [resettingPasswordUser, setResettingPasswordUser] = useState<AdminUserData | null>(null);

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Rôles</TableHead>
              <TableHead>Config Komga</TableHead>
              <TableHead>Préférences</TableHead>
              <TableHead>Favoris</TableHead>
              <TableHead>Créé le</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Aucun utilisateur
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {user.roles.map((role) => (
                        <Badge
                          key={role}
                          variant={role === "ROLE_ADMIN" ? "default" : "secondary"}
                        >
                          {role.replace("ROLE_", "")}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.hasKomgaConfig ? (
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-xs text-green-600 dark:text-green-400">Configuré</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <X className="h-4 w-4 text-red-500" />
                        <span className="text-xs text-red-600 dark:text-red-400">Non configuré</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.hasPreferences ? (
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-xs text-green-600 dark:text-green-400">Oui</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <X className="h-4 w-4 text-red-500" />
                        <span className="text-xs text-red-600 dark:text-red-400">Non</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{user._count?.favorites || 0}</TableCell>
                  <TableCell>
                    {new Date(user.createdAt).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingUser(user)}
                        title="Modifier les rôles"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setResettingPasswordUser(user)}
                        title="Réinitialiser le mot de passe"
                      >
                        <KeyRound className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingUser(user)}
                        title="Supprimer l'utilisateur"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {editingUser && (
        <EditUserDialog
          user={editingUser}
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
          onSuccess={() => {
            setEditingUser(null);
            onUserUpdated();
          }}
        />
      )}

      {resettingPasswordUser && (
        <ResetPasswordDialog
          user={resettingPasswordUser}
          open={!!resettingPasswordUser}
          onOpenChange={(open) => !open && setResettingPasswordUser(null)}
          onSuccess={() => {
            setResettingPasswordUser(null);
          }}
        />
      )}

      {deletingUser && (
        <DeleteUserDialog
          user={deletingUser}
          open={!!deletingUser}
          onOpenChange={(open) => !open && setDeletingUser(null)}
          onSuccess={() => {
            setDeletingUser(null);
            onUserUpdated();
          }}
        />
      )}
    </>
  );
}

