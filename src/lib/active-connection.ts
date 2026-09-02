import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import type { ProviderType } from "@/lib/providers/types";

const ACTIVE_PROVIDER_COOKIE = "stripstream-active-provider";
const ACTIVE_KOMGA_CONFIG_COOKIE = "stripstream-active-komga-config";
const ACTIVE_STRIPSTREAM_CONFIG_COOKIE = "stripstream-active-stripstream-config";

export interface ActiveConnection {
  provider: ProviderType;
  configId: number | null;
}

function parseConfigId(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/**
 * Resolves the connection selected by this browser. The database remains the
 * source of connection details, but not of the active selection.
 */
export async function getActiveConnection(userId: number): Promise<ActiveConnection> {
  const cookieStore = await cookies();
  const provider = cookieStore.get(ACTIVE_PROVIDER_COOKIE)?.value as ProviderType | undefined;
  const configId = parseConfigId(
    cookieStore.get(
      provider === "stripstream"
        ? ACTIVE_STRIPSTREAM_CONFIG_COOKIE
        : ACTIVE_KOMGA_CONFIG_COOKIE
    )?.value
  );

  if (provider === "komga" && configId) {
    const config = await prisma.komgaConfig.findFirst({
      where: { id: configId, userId },
      select: { id: true },
    });
    if (config) return { provider, configId: config.id };
  }

  if (provider === "stripstream" && configId) {
    const config = await prisma.stripstreamConfig.findFirst({
      where: { id: configId, userId },
      select: { id: true },
    });
    if (config) return { provider, configId: config.id };
  }

  const [komgaConfig, stripstreamConfig] = await Promise.all([
    prisma.komgaConfig.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    }),
    prisma.stripstreamConfig.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    }),
  ]);

  if (komgaConfig) return { provider: "komga", configId: komgaConfig.id };
  if (stripstreamConfig) return { provider: "stripstream", configId: stripstreamConfig.id };
  return { provider: "komga", configId: null };
}

export async function setActiveConnection(
  provider: ProviderType,
  configId: number
): Promise<void> {
  const cookieStore = await cookies();
  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    secure: process.env.NODE_ENV === "production",
  };

  cookieStore.set(ACTIVE_PROVIDER_COOKIE, provider, options);
  cookieStore.set(
    provider === "komga" ? ACTIVE_KOMGA_CONFIG_COOKIE : ACTIVE_STRIPSTREAM_CONFIG_COOKIE,
    String(configId),
    options
  );
}
