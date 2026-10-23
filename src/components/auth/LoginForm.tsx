"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useTranslate } from "@/hooks/useTranslate";
import type { AppErrorType } from "@/types/global";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface LoginFormProps {
  from?: string;
}

export function LoginForm({ from }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AppErrorType | null>(null);
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
    const remember = formData.get("remember") === "on";

    try {
      const result = await signIn("credentials", {
        email,
        password,
        remember,
        redirect: false,
      });

      if (!result || result.error || !result.ok) {
        setError({
          code: "AUTH_INVALID_CREDENTIALS",
          name: "Login failed",
          message: "Email ou mot de passe incorrect",
        });
        return;
      }

      const redirectPath = getSafeRedirectPath(from);
      window.location.href = redirectPath;
    } catch {
      setError({
        code: "AUTH_FETCH_ERROR",
        name: "Login error",
        message: "Une erreur est survenue lors de la connexion",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          autoComplete="current-password"
          className="h-11 rounded-lg bg-background/60"
          required
        />
      </div>
      <div className="flex items-center gap-2.5">
        <Checkbox
          id="remember"
          name="remember"
          defaultChecked
          className="h-[18px] w-[18px] rounded-[4px]"
        />
        <Label htmlFor="remember" className="cursor-pointer text-sm text-muted-foreground">
          {t("login.form.remember")}
        </Label>
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
        {isLoading ? t("login.form.submit.loading.login") : t("login.form.submit.login")}
      </Button>
    </form>
  );
}
