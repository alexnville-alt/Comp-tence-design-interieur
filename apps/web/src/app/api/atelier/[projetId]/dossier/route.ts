import { NextResponse } from "next/server";
import { requireOnboardedUser } from "@/lib/auth";
import { getProjectDossierData } from "@/features/project-personal/dossier-data";
import { buildProjectDossierPdf } from "@/features/project-personal/dossier";

/** Export dossier PDF (docs/05 M10, PROJ-08) : plans, moodboards, listes de mobilier et budget. */
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projetId: string }> },
) {
  const { projetId } = await params;
  const user = await requireOnboardedUser();

  const data = await getProjectDossierData(user.id, projetId);
  if (!data) {
    return new NextResponse("Projet introuvable.", { status: 404 });
  }

  const pdfBytes = await buildProjectDossierPdf(data);
  const filename = `dossier-${
    data.projectName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "projet"
  }.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
