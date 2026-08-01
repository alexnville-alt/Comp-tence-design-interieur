import { describe, expect, it } from "vitest";
import { buildPhotoStorageKey } from "./keys";

describe("buildPhotoStorageKey", () => {
  it("préfixe la clé par photos/<userId>/", () => {
    expect(buildPhotoStorageKey("user-1")).toMatch(/^photos\/user-1\//);
  });

  it("ne dérive jamais la clé d'un nom de fichier fourni par le client", () => {
    const key = buildPhotoStorageKey("user-1");
    expect(key).not.toContain("..");
    expect(key).not.toMatch(/[<>:"|?*]/);
  });

  it("génère une clé différente à chaque appel", () => {
    const a = buildPhotoStorageKey("user-1");
    const b = buildPhotoStorageKey("user-1");
    expect(a).not.toBe(b);
  });
});
