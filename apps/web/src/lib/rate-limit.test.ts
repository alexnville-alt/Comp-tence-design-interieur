import { afterEach, describe, expect, it, vi } from "vitest";
import {
  RATE_LIMITS,
  __resetAllRateLimits,
  rateLimit,
  resetRateLimit,
} from "./rate-limit";

afterEach(() => {
  __resetAllRateLimits();
  vi.useRealTimers();
});

describe("rateLimit", () => {
  it("autorise jusqu'à la limite puis refuse", () => {
    for (let i = 1; i <= 3; i++) {
      expect(rateLimit("k", 3, 1000).allowed, `tentative ${i}`).toBe(true);
    }
    expect(rateLimit("k", 3, 1000).allowed).toBe(false);
  });

  it("décompte les tentatives restantes", () => {
    expect(rateLimit("k", 3, 1000).remaining).toBe(2);
    expect(rateLimit("k", 3, 1000).remaining).toBe(1);
    expect(rateLimit("k", 3, 1000).remaining).toBe(0);
  });

  it("isole les seaux par clé", () => {
    rateLimit("a", 1, 1000);
    expect(rateLimit("a", 1, 1000).allowed).toBe(false);
    // Une clé distincte (autre e-mail, autre IP) n'est pas affectée.
    expect(rateLimit("b", 1, 1000).allowed).toBe(true);
  });

  it("rouvre le seau après la fenêtre", () => {
    vi.useFakeTimers();
    rateLimit("k", 1, 1000);
    expect(rateLimit("k", 1, 1000).allowed).toBe(false);

    vi.advanceTimersByTime(1001);
    expect(rateLimit("k", 1, 1000).allowed).toBe(true);
  });

  it("indique un délai d'attente exploitable", () => {
    vi.useFakeTimers();
    rateLimit("k", 1, 60_000);
    const refus = rateLimit("k", 1, 60_000);
    expect(refus.allowed).toBe(false);
    expect(refus.retryAfterSeconds).toBeGreaterThan(0);
    expect(refus.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("permet une remise à zéro après une connexion réussie", () => {
    rateLimit("k", 1, 1000);
    expect(rateLimit("k", 1, 1000).allowed).toBe(false);
    resetRateLimit("k");
    expect(rateLimit("k", 1, 1000).allowed).toBe(true);
  });
});

describe("réglages", () => {
  it("limite l'e-mail plus strictement que l'IP", () => {
    // Une IP n'identifie pas une personne (NAT, CGNAT) : son seuil doit rester
    // nettement plus permissif, sinon on bloque des utilisateurs légitimes.
    expect(RATE_LIMITS.loginPerIp.limit).toBeGreaterThan(RATE_LIMITS.loginPerEmail.limit);
  });

  it("laisse assez de tentatives pour un usage normal", () => {
    expect(RATE_LIMITS.loginPerEmail.limit).toBeGreaterThanOrEqual(5);
    expect(RATE_LIMITS.signup.limit).toBeGreaterThanOrEqual(10);
  });
});
