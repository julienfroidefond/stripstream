"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useTranslate } from "@/hooks/useTranslate";
import type { AppErrorType } from "@/types/global";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface RegisterFormProps {
  from?: string;
}

export function RegisterForm({ from: _from }: RegisterFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AppErrorType | null>(null);
  const { t } = useTranslate();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError({
        code: "AUTH_PASSWORD_MISMATCH",
        name: "Password mismatch",
        message: "Les mots de passe ne correspondent pas",
      });
      setIsLoading(false);
      return;
    }

    try {
      // Étape 1: Inscription via l'API
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(
          data.error || {
            code: "AUTH_REGISTRATION_FAILED",
            name: "Registration failed",
            message: "Erreur lors de l'inscription",
          }
        );
        return;
      }

      // Étape 2: Connexion automatique via NextAuth
      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        setError({
          code: "AUTH_INVALID_CREDENTIALS",
          name: "Login failed",
          message: "Inscription réussie mais erreur lors de la connexion automatique",
        });
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError({
        code: "AUTH_REGISTRATION_FAILED",
        name: "Registration failed",
        message: "Une erreur est survenue lors de l'inscription",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">{t("login.form.email")}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t("login.form.password")}</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">{t("login.form.confirmPassword")}</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>
      {error && <ErrorMessage errorCode={error.code} variant="form" />}
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? t("login.form.submit.loading.register") : t("login.form.submit.register")}
      </Button>
    </form>
  );
}
