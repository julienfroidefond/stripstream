"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useTranslate } from "@/hooks/useTranslate";

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
        <label
          htmlFor="email"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {t("login.form.email")}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue="demo@stripstream.local"
          className="flex h-10 w-full rounded-md border border-input bg-background/70 backdrop-blur-md px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      <div className="space-y-2">
        <label
          htmlFor="password"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {t("login.form.password")}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          defaultValue="fft$VSD96dis"
          className="flex h-10 w-full rounded-md border border-input bg-background/70 backdrop-blur-md px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      <div className="flex items-center space-x-2">
        <input
          id="remember"
          name="remember"
          type="checkbox"
          defaultChecked
          className="h-4 w-4 rounded border border-input ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        <label
          htmlFor="remember"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {t("login.form.remember")}
        </label>
      </div>
      {error && (
        <div className="text-red-600 text-sm">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={isLoading}
        className="bg-[#4F46E5] inline-flex w-full items-center justify-center rounded-md bg-primary/90 backdrop-blur-md px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
      >
        {isLoading ? t("login.form.submit.loading.login") : t("login.form.submit.login")}
      </button>
    </form>
  );
}
