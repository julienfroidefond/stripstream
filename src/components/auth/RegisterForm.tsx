"use client";

import { useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { shake } from "@/lib/celebrate";
import { useGsapEffect } from "@/lib/gsap";
import { useTranslate } from "@/hooks/useTranslate";
import type { AppErrorType } from "@/types/global";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { registerUser } from "@/app/actions/auth";

interface RegisterFormProps {
  from?: string;
}

export function RegisterForm({ from }: RegisterFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AppErrorType | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  // Une erreur fait secouer la tête au formulaire.
  useGsapEffect(
    () => {
      if (error) shake(formRef.current);
    },
    { dependencies: [error] }
  );
  const { t } = useTranslate();

  const getSafeRedirectPath = (path?: string) => {
    if (!path || !path.startsWith("/") || path.startsWith("//")) {
      return "/";
    }

    return path;
  };

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
      // Étape 1: Inscription via Server Action
      const result = await registerUser(email, password);

      if (!result.success) {
        setError({
          code: "AUTH_REGISTRATION_FAILED",
          name: "Registration failed",
          message: result.message,
        });
        return;
      }

      // Étape 2: Connexion automatique via NextAuth
      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!signInResult || signInResult.error || !signInResult.ok) {
        setError({
          code: "AUTH_INVALID_CREDENTIALS",
          name: "Login failed",
          message: "Inscription réussie mais erreur lors de la connexion automatique",
        });
      } else {
        const redirectPath = getSafeRedirectPath(from);
        window.location.href = redirectPath;
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
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium text-foreground/80">
          {t("login.form.email")}
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          className="h-11 rounded-lg bg-background/60"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium text-foreground/80">
          {t("login.form.password")}
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          className="h-11 rounded-lg bg-background/60"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground/80">
          {t("login.form.confirmPassword")}
        </Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          className="h-11 rounded-lg bg-background/60"
          required
        />
      </div>
      {error && <ErrorMessage errorCode={error.code} variant="form" />}
      <Button
        type="submit"
        size="lg"
        disabled={isLoading}
        aria-busy={isLoading}
        className="h-11 w-full rounded-lg font-semibold"
      >
        {isLoading && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
        {isLoading ? t("login.form.submit.loading.register") : t("login.form.submit.register")}
      </Button>
    </form>
  );
}
