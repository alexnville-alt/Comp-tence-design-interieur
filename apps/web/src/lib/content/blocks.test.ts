import { describe, expect, it } from "vitest";
import { formatBlockNumberingError, validateBlockNumbering } from "./blocks";

describe("validateBlockNumbering", () => {
  it("accepte une numérotation contiguë à partir de 1", () => {
    const source = `
<Texte n={1} titre="Accroche">Contenu…</Texte>

<ErreurFrequente n={2}>Une erreur fréquente…</ErreurFrequente>

<ConseilDePro n={3}>Un conseil…</ConseilDePro>
`;
    const result = validateBlockNumbering(source);
    expect(result.valid).toBe(true);
    expect(result.blockCount).toBe(3);
    expect(result.error).toBeUndefined();
  });

  it("accepte une leçon sans aucun bloc (fichier vide de blocs)", () => {
    const result = validateBlockNumbering("Juste du texte MDX brut, sans composant.");
    expect(result.valid).toBe(true);
    expect(result.blockCount).toBe(0);
  });

  it("détecte un trou dans la numérotation", () => {
    const source = `<Texte n={1}>A</Texte>\n<Texte n={3}>B</Texte>`;
    const result = validateBlockNumbering(source);
    expect(result.valid).toBe(false);
    expect(result.error).toEqual({
      position: 2,
      componentName: "Texte",
      found: 3,
      expected: 2,
    });
  });

  it("détecte un doublon (copier-coller sans renumérotation)", () => {
    const source = `<Texte n={1}>A</Texte>\n<ErreurFrequente n={1}>B</ErreurFrequente>`;
    const result = validateBlockNumbering(source);
    expect(result.valid).toBe(false);
    expect(result.error?.found).toBe(1);
    expect(result.error?.expected).toBe(2);
  });

  it("détecte une numérotation qui commence à 0 ou 2 au lieu de 1", () => {
    expect(validateBlockNumbering(`<Texte n={0}>A</Texte>`).valid).toBe(false);
    expect(validateBlockNumbering(`<Texte n={2}>A</Texte>`).valid).toBe(false);
  });

  it("détecte un ordre inversé", () => {
    const source = `<Texte n={2}>A</Texte>\n<Texte n={1}>B</Texte>`;
    const result = validateBlockNumbering(source);
    expect(result.valid).toBe(false);
    expect(result.error?.position).toBe(1);
    expect(result.error?.found).toBe(2);
  });

  it("ignore les attributs qui précèdent n dans la balise", () => {
    const source = `<ConseilDePro auteur="Une architecte" n={1}>Texte</ConseilDePro>`;
    expect(validateBlockNumbering(source).valid).toBe(true);
  });

  it("compte chacun des 11 types de blocs reconnus", () => {
    const source = [
      "Texte",
      "ImageAnnotee",
      "Schema",
      "AvantApres",
      "ErreurFrequente",
      "ConseilDePro",
      "InterieurCelebre",
      "ARetenir",
      "TableauComparatif",
      "EmplacementVideo",
      "AllerPlusLoin",
    ]
      .map((name, i) => `<${name} n={${i + 1}}>Contenu</${name}>`)
      .join("\n");

    const result = validateBlockNumbering(source);
    expect(result.valid).toBe(true);
    expect(result.blockCount).toBe(11);
  });

  it("ignore un composant qui ne fait pas partie de la liste reconnue", () => {
    // `MonComposant` n'est pas un type de bloc pédagogique : il ne doit pas
    // être compté, même s'il porte lui aussi un attribut n={...}.
    const source = `<Texte n={1}>A</Texte>\n<MonComposant n={99} />`;
    const result = validateBlockNumbering(source);
    expect(result.valid).toBe(true);
    expect(result.blockCount).toBe(1);
  });
});

describe("formatBlockNumberingError", () => {
  it("produit un message qui identifie le bloc fautif et la correction attendue", () => {
    const message = formatBlockNumberingError({
      position: 2,
      componentName: "ErreurFrequente",
      found: 4,
      expected: 2,
    });
    expect(message).toContain("2ᵉ bloc");
    expect(message).toContain("ErreurFrequente");
    expect(message).toContain("n={4}");
    expect(message).toContain("n={2}");
  });
});
