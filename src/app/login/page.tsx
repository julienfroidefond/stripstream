import type { Metadata } from "next";
import { LoginContent } from "./LoginContent";
import { withPageTiming } from "@/lib/hoc/withPageTiming";

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

async function LoginPage({ searchParams }: PageProps) {
  return <LoginContent searchParams={await searchParams} />;
}
export default withPageTiming("LoginPage", LoginPage);
