import type { Metadata } from "next";
import { isRegistrationEnabled } from "@/lib/auth/registration";
import { LoginContent } from "./LoginContent";

interface PageProps {
  searchParams: Promise<{
    from?: string;
    tab?: string;
  }>;
}
export const metadata: Metadata = {
  title: "Connexion",
  description: "Connectez-vous à votre compte StripStream",
};

export default async function LoginPage({ searchParams }: PageProps) {
  return (
    <LoginContent
      searchParams={await searchParams}
      registrationEnabled={isRegistrationEnabled()}
    />
  );
}
