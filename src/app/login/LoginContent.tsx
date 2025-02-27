"use client";

import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslate } from "@/hooks/useTranslate";

interface LoginContentProps {
  searchParams: {
    from?: string;
    tab?: string;
  };
}

export function LoginContent({ searchParams }: LoginContentProps) {
  const { t } = useTranslate();
  const defaultTab = searchParams.tab || "login";

  return (
    <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full flex-col bg-slate-800/80 p-10 text-white lg:flex dark:border-r overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 transition-opacity duration-200 ease-in-out"
          style={{
            backgroundImage: "url('/images/login-bg.jpg')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-800/20 to-slate-800/70" />
        <div className="relative z-20 flex items-center text-lg font-medium">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2 h-6 w-6"
          >
            <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
          </svg>
          StripStream
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">{t("login.description")}</p>
          </blockquote>
        </div>
      </div>
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">{t("login.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("login.subtitle")}</p>
          </div>
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t("login.tabs.login")}</TabsTrigger>
              <TabsTrigger value="register">{t("login.tabs.register")}</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <LoginForm from={searchParams.from} />
            </TabsContent>
            <TabsContent value="register">
              <RegisterForm from={searchParams.from} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
