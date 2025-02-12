import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "StripStream - Komga Reader",
  description: "A modern web reader for Komga",
  icons: {
    icon: [
      {
        url: "/favicon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: [
      {
        url: "/favicon.svg",
        type: "image/svg+xml",
      },
    ],
  },
  manifest: "/manifest.json",
};

// Composant client séparé pour le layout
import ClientLayout from "@/components/layout/ClientLayout";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={inter.className}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
