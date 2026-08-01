import { describe, expect, it } from "vitest";
import {
  PASSWORD_MIN_LENGTH,
  checkPassword,
  PASSWORD_ISSUE_MESSAGES,
} from "./password-policy";

describe("checkPassword", () => {
  it("accepte une phrase de passe longue sans complexité imposée", () => {
    // Conformément à NIST SP 800-63B, la longueur prime : cette phrase est
    // solide sans majuscule, chiffre ni caractère spécial.
    const result = checkPassword("le chat dort sur le radiateur");
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("refuse un mot de passe trop court", () => {
    const result = checkPassword("court1");
    expect(result.valid).toBe(false);
    expect(result.issues).toContain("too_short");
  });

  it(`accepte exactement ${PASSWORD_MIN_LENGTH} caractères`, () => {
    const result = checkPassword("a".repeat(PASSWORD_MIN_LENGTH - 1) + "b");
    expect(result.issues).not.toContain("too_short");
  });

  it("refuse un mot de passe trop long", () => {
    expect(checkPassword("a1".repeat(150)).issues).toContain("too_long");
  });

  it("refuse les mots de passe courants malgré une longueur suffisante", () => {
    const result = checkPassword("motdepasse1");
    expect(result.valid).toBe(false);
    expect(result.issues).toContain("too_common");
    // Un mot de passe trivial ne doit jamais afficher une jauge rassurante.
    expect(result.strength).toBe(0);
  });

  it("ignore la casse et les espaces pour détecter un mot de passe courant", () => {
    expect(checkPassword("  MotDePasse1  ").issues).toContain("too_common");
  });

  it("refuse une seule lettre répétée", () => {
    const result = checkPassword("aaaaaaaaaaaa");
    expect(result.issues).toContain("repeated_characters");
    expect(result.strength).toBe(0);
  });

  it("refuse un mot de passe contenant la partie locale de l'e-mail", () => {
    const result = checkPassword("alexnville-super", "alexnville@gmail.com");
    expect(result.valid).toBe(false);
    expect(result.issues).toContain("contains_email");
  });

  it("ignore une partie locale trop courte pour être significative", () => {
    // « al » apparaît dans trop de mots pour constituer un signal fiable.
    const result = checkPassword("alpinisme extreme", "al@exemple.fr");
    expect(result.issues).not.toContain("contains_email");
  });

  it("n'utilise pas l'e-mail quand il n'est pas fourni", () => {
    expect(checkPassword("alexnville-super").valid).toBe(true);
  });

  it("accumule plusieurs problèmes simultanés", () => {
    const result = checkPassword("alex", "alex@exemple.fr");
    expect(result.issues).toContain("too_short");
    expect(result.issues).toContain("contains_email");
  });

  it("attribue une force croissante avec la longueur et la variété", () => {
    expect(checkPassword("").strength).toBe(0);
    expect(checkPassword("bonjourlala").strength).toBeLessThan(
      checkPassword("Bonjour-La-Lune-42!").strength,
    );
    expect(checkPassword("Bonjour-La-Lune-42-Et-Mars!").strength).toBe(4);
  });

  it("laisse la longueur seule atteindre le score maximal", () => {
    // Cohérence avec la politique : on récompense la longueur, pas la
    // complexité typographique. Sans cela, la jauge inciterait à l'inverse de
    // ce que la règle recommande.
    const phrase = "le chat dort sur le radiateur";
    expect(phrase.length).toBeGreaterThanOrEqual(25);
    expect(checkPassword(phrase).strength).toBe(4);
  });

  it("fournit un message pour chaque type de problème", () => {
    for (const issue of [
      "too_short",
      "too_long",
      "too_common",
      "repeated_characters",
      "contains_email",
    ] as const) {
      expect(PASSWORD_ISSUE_MESSAGES[issue]).toBeTruthy();
    }
  });
});
