import { describe, expect, it } from "vitest";
import { isChatStreamEvent, parseSseFrame } from "./sse";

describe("parseSseFrame", () => {
  it("extrait le JSON d'une trame « data: »", () => {
    expect(parseSseFrame('data: {"type":"delta","text":"bonjour"}')).toEqual({
      type: "delta",
      text: "bonjour",
    });
  });

  it("tolère les espaces autour de la trame", () => {
    expect(parseSseFrame('  data: {"type":"done"}  \n')).toEqual({ type: "done" });
  });

  it("renvoie null pour une trame vide", () => {
    expect(parseSseFrame("")).toBeNull();
  });

  it("renvoie null pour une trame qui n'est pas « data: »", () => {
    expect(parseSseFrame("event: ping")).toBeNull();
  });

  it("renvoie null pour un JSON malformé plutôt que de lever une exception", () => {
    expect(parseSseFrame("data: {invalide")).toBeNull();
  });
});

describe("isChatStreamEvent", () => {
  it.each(["conversation", "delta", "done", "error"])("accepte le type %s", (type) => {
    expect(isChatStreamEvent({ type })).toBe(true);
  });

  it("rejette une valeur sans champ type", () => {
    expect(isChatStreamEvent({})).toBe(false);
  });

  it("rejette un type inconnu", () => {
    expect(isChatStreamEvent({ type: "autre-chose" })).toBe(false);
  });

  it("rejette les valeurs non-objet", () => {
    expect(isChatStreamEvent(null)).toBe(false);
    expect(isChatStreamEvent("delta")).toBe(false);
    expect(isChatStreamEvent(42)).toBe(false);
  });
});
