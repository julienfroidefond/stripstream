"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useTranslate } from "@/hooks/useTranslate";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface LoginFormProps {
  from?: string;
}

export function LoginForm({ from }: LoginFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslate();

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

      if (result?.error) {
        setError("Email ou mot de passe incorrect");
      } else {
        router.push(from || "/");
        router.refresh();
      }
    } catch (_error) {
      setError("Une erreur est survenue lors de la connexion : " + _error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">{t("login.form.email")}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue="demo@stripstream.local"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t("login.form.password")}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          defaultValue="fft$VSD96dis"
        />
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="remember" name="remember" defaultChecked />
        <Label htmlFor="remember" className="cursor-pointer">
          {t("login.form.remember")}
        </Label>
      </div>
      {error && <div className="text-sm text-destructive">{error}</div>}
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? t("login.form.submit.loading.login") : t("login.form.submit.login")}
      </Button>
    </form>
  );
}
