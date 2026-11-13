import prisma from "@/lib/prisma";
import logger from "@/lib/logger";

/**
 * Sonde de santé du conteneur (`HEALTHCHECK` du Dockerfile, healthcheck
 * compose). Publique — le proxy ne l'exempte d'authentification que pour ce
 * chemin exact — donc elle ne renvoie rien d'autre qu'un statut : ni version,
 * ni chemin de base, ni message d'erreur.
 *
 * 200 si la base répond à `SELECT 1`, 503 sinon. Jamais mise en cache.
 */
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(): Promise<Response> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" }, { status: 200, headers: NO_STORE });
  } catch (error) {
    logger.error({ err: error }, "Health check failed: database unreachable");
    return Response.json({ status: "unavailable" }, { status: 503, headers: NO_STORE });
  }
}
