"use client";

import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslate } from "@/hooks/useTranslate";
import LanguageSelector from "@/components/LanguageSelector";
import { motion } from "framer-motion";

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
    <div className="relative grid min-h-dvh lg:grid-cols-2">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="absolute top-4 right-4 z-50 transition-transform hover:scale-105"
      >
        <LanguageSelector />
      </motion.div>

      <div className="relative hidden h-full flex-col overflow-hidden bg-[hsl(30_7%_4%)] p-10 text-white lg:flex">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 transition-opacity duration-700 ease-out hover:opacity-50"
          style={{
            backgroundImage: "url('/images/login-bg.jpg')",
          }}
        />
        <div className="absolute inset-0 bg-linear-to-b from-black/20 via-black/50 to-black/90" />{/* taste-skill-ignore: scrim neutre au-dessus de l'image de fond */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative z-20 flex items-center text-lg font-medium"
        >
          <motion.img
            src="/images/logostripstream.png"
            alt="StripStream Logo"
            className="mr-3 hidden h-9 w-9 rounded-md object-cover dark:block"
            whileHover={{ scale: 1.08, rotate: -3 }}
            transition={{ duration: 0.3 }}
          />
          <motion.img
            src="/images/logostripstream-white.png"
            alt="StripStream Logo"
            className="mr-3 h-9 w-9 rounded-md object-cover dark:hidden"
            whileHover={{ scale: 1.08, rotate: -3 }}
            transition={{ duration: 0.3 }}
          />
          <span className="font-display text-2xl font-bold tracking-tight">
            Strip<span className="text-primary">Stream</span>
          </span>
        </motion.div>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="relative z-20 mt-auto"
        >
          <blockquote className="space-y-2">
            <p className="text-xl font-light leading-relaxed tracking-wide text-white/80">
              {t("login.description")}
            </p>
          </blockquote>
        </motion.div>
      </div>

      <motion.div
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="flex items-center justify-center p-6 lg:p-8"
      >
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-surface-2 ring-1 ring-border">
              <motion.img
                src="/images/logostripstream.png"
                alt="StripStream Logo"
                className="hidden h-full w-full object-cover dark:block"
                initial={{ scale: 1.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                whileHover={{ scale: 1.05 }}
              />
              <motion.img
                src="/images/logostripstream-white.png"
                alt="StripStream Logo"
                className="h-full w-full object-cover dark:hidden"
                initial={{ scale: 1.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                whileHover={{ scale: 1.05 }}
              />
            </div>
            <motion.h1
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              className="font-display text-3xl font-bold tracking-tight"
            >
              {t("login.title")}
            </motion.h1>
            <p className="text-sm text-muted-foreground">{t("login.subtitle")}</p>
          </div>
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t("login.tabs.login")}</TabsTrigger>
              <TabsTrigger value="register">{t("login.tabs.register")}</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="mt-6">
              <LoginForm from={searchParams.from} />
            </TabsContent>
            <TabsContent value="register" className="mt-6">
              <RegisterForm from={searchParams.from} />
            </TabsContent>
          </Tabs>
        </div>
      </motion.div>
    </div>
  );
}
