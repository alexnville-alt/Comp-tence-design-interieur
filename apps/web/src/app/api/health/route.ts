import { NextResponse } from "next/server";
import { prisma } from "@atelier/db";

/**
 * Sonde de santé.
 *
 * Vérifie la base, pas seulement le processus : un serveur qui répond alors
 * que sa base est injoignable est « vivant » sans être utile, et un
 * orchestrateur qui ne teste que le processus ne le remplacera jamais.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", database: "ok" });
  } catch {
    return NextResponse.json(
      { status: "degraded", database: "unreachable" },
      { status: 503 },
    );
  }
}
