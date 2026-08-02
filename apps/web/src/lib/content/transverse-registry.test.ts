import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ContentValidationError } from "./frontmatter";
import {
  scanChallenges,
  scanFamousInteriors,
  scanMilestoneProjects,
} from "./transverse-registry";

let tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
  tempDirs = [];
});

function makeContentRoot(): string {
  const dir = mkdtempSync(join(tmpdir(), "atelier-transverse-"));
  tempDirs.push(dir);
  return dir;
}

function writeMdx(
  root: string,
  folder: string,
  filename: string,
  content: string,
): string {
  const dir = join(root, folder);
  mkdirSync(dir, { recursive: true });
  const filePath = join(dir, filename);
  writeFileSync(filePath, content);
  return filePath;
}

const VALID_FAMOUS_INTERIOR = `---
slug: villa-savoye
name: Villa Savoye
architect: Le Corbusier
year: "1931"
location: Poissy, France
context: Résidence secondaire, manifeste des cinq points de l'architecture moderne.
designIntent: La maison comme « machine à habiter ».
light: Bandeau de fenêtres continu.
materials: Béton armé enduit blanc.
circulation: Une rampe organise tout le parcours.
takeaways:
  - Un plan libre facilite un usage qui change avec le temps.
---
`;

describe("scanFamousInteriors", () => {
  it("lit une fiche valide", () => {
    const root = makeContentRoot();
    writeMdx(root, "interieurs-celebres", "villa-savoye.mdx", VALID_FAMOUS_INTERIOR);

    const items = scanFamousInteriors(root);
    expect(items).toHaveLength(1);
    expect(items[0]!.frontmatter.name).toBe("Villa Savoye");
  });

  it("rejette deux fiches avec le même slug", () => {
    const root = makeContentRoot();
    writeMdx(root, "interieurs-celebres", "a.mdx", VALID_FAMOUS_INTERIOR);
    writeMdx(root, "interieurs-celebres", "b.mdx", VALID_FAMOUS_INTERIOR);

    expect(() => scanFamousInteriors(root)).toThrowError(/déjà utilisé/);
  });

  it("rejette un frontmatter invalide avec le chemin du fichier fautif", () => {
    const root = makeContentRoot();
    const filePath = writeMdx(
      root,
      "interieurs-celebres",
      "invalide.mdx",
      `---\nslug: "Pas Un Slug"\nname: Test\n---\n`,
    );

    try {
      scanFamousInteriors(root);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ContentValidationError);
      expect((error as ContentValidationError).message).toContain(filePath);
    }
  });
});

const milestoneProject = (phase: number, slug: string) => `---
slug: ${slug}
phase: ${phase}
title: Projet jalon
brief: Réaménagez une pièce simple.
deliverables:
  - Un plan coté
evaluationCriteria:
  - La circulation respecte les distances minimales
---
`;

describe("scanMilestoneProjects", () => {
  it("lit un brief valide", () => {
    const root = makeContentRoot();
    writeMdx(root, "projets-jalons", "a.mdx", milestoneProject(1, "projet-a"));

    const items = scanMilestoneProjects(root);
    expect(items).toHaveLength(1);
    expect(items[0]!.frontmatter.phase).toBe(1);
  });

  it("rejette deux projets jalons pour la même phase", () => {
    const root = makeContentRoot();
    writeMdx(root, "projets-jalons", "a.mdx", milestoneProject(1, "projet-a"));
    writeMdx(root, "projets-jalons", "b.mdx", milestoneProject(1, "projet-b"));

    expect(() => scanMilestoneProjects(root)).toThrowError(/déjà couverte/);
  });
});

const challenge = (weekIndex: number, slug: string) => `---
slug: ${slug}
weekIndex: ${weekIndex}
title: Un défi
scenario: Une entrée de 3 m².
constraint: Budget de 500 €.
gradingNotes: Attendre un rangement vertical.
---
`;

describe("scanChallenges", () => {
  it("lit un défi valide", () => {
    const root = makeContentRoot();
    writeMdx(root, "defis", "a.mdx", challenge(1, "defi-a"));

    const items = scanChallenges(root);
    expect(items).toHaveLength(1);
    expect(items[0]!.frontmatter.weekIndex).toBe(1);
  });

  it("rejette deux défis avec le même weekIndex", () => {
    const root = makeContentRoot();
    writeMdx(root, "defis", "a.mdx", challenge(1, "defi-a"));
    writeMdx(root, "defis", "b.mdx", challenge(1, "defi-b"));

    expect(() => scanChallenges(root)).toThrowError(/déjà utilisé/);
  });
});
