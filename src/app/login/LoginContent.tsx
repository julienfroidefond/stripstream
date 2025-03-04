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
    <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="absolute top-4 right-4 z-50 hover:scale-105 transition-transform"
      >
        <LanguageSelector />
      </motion.div>

      <div className="relative hidden h-full flex-col bg-slate-900 p-10 text-white lg:flex dark:border-r overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 transition-opacity duration-200 ease-in-out hover:opacity-50 transform hover:scale-105 transition-transform duration-10000 ease-linear"
          style={{
            backgroundImage: "url('/images/login-bg.jpg')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/30 via-slate-900/50 to-slate-900/90" />
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative z-20 flex items-center text-lg font-medium"
        >
          <motion.svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2 h-6 w-6"
            whileHover={{ rotate: 180 }}
            transition={{ duration: 0.3 }}
          >
            <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
          </motion.svg>
          <span className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            StripStream
          </span>
        </motion.div>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="relative z-20 mt-auto"
        >
          <blockquote className="space-y-2">
            <p className="text-xl font-light leading-relaxed tracking-wide text-gray-200">
              {t("login.description")}
            </p>
          </blockquote>
        </motion.div>
      </div>
      <motion.div
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="lg:p-8"
      >
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#4F46E5] to-[#6366F1] rounded-full opacity-75 blur-md animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-white to-gray-100 dark:from-slate-800 dark:to-slate-900 rounded-full shadow-xl overflow-hidden w-24 h-24 flex items-center justify-center">
                <motion.img
                  src="/images/icons/apple-icon-180x180.png"
                  alt="StripStream Logo"
                  className="w-[100%] h-[100%] object-cover"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  whileHover={{ scale: 1.05 }}
                />
              </div>
            </div>
            <motion.h1
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent"
            >
              {t("login.title")}
            </motion.h1>
            <p className="text-sm text-muted-foreground">{t("login.subtitle")}</p>
          </div>
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
              <TabsTrigger
                value="login"
                className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700 transition-all duration-200"
              >
                {t("login.tabs.login")}
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700 transition-all duration-200"
              >
                {t("login.tabs.register")}
              </TabsTrigger>
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
