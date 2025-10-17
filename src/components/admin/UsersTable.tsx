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
import { StatusBadge } from "@/components/ui/status-badge";

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
      <div className="rounded-lg border bg-card/70 backdrop-blur-md shadow-sm">
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
                      <StatusBadge status="success" icon={Check}>
                        Configuré
                      </StatusBadge>
                    ) : (
                      <StatusBadge status="error" icon={X}>
                        Non configuré
                      </StatusBadge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.hasPreferences ? (
                      <StatusBadge status="success" icon={Check}>
                        Oui
                      </StatusBadge>
                    ) : (
                      <StatusBadge status="error" icon={X}>
                        Non
                      </StatusBadge>
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
          onOpenChange={(open: boolean) => !open && setEditingUser(null)}
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
          onOpenChange={(open: boolean) => !open && setResettingPasswordUser(null)}
          onSuccess={() => {
            setResettingPasswordUser(null);
          }}
        />
      )}

      {deletingUser && (
        <DeleteUserDialog
          user={deletingUser}
          open={!!deletingUser}
          onOpenChange={(open: boolean) => !open && setDeletingUser(null)}
          onSuccess={() => {
            setDeletingUser(null);
            onUserUpdated();
          }}
        />
      )}
    </>
  );
}

