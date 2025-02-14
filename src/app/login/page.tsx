import { Metadata } from "next";
import { LoginContent } from "./LoginContent";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connectez-vous à votre compte StripStream",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { from?: string; tab?: string };
}) {
  return <LoginContent searchParams={searchParams} />;
}
