import { describe, expect, test } from "bun:test";
import { anonymizeSignal } from "./analytics";

describe("detectDevice", () => {
  test("mobile UAs", () => {
    expect(
      anonymizeSignal({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Mobile" }).device_type,
    ).toBe("mobile");
    expect(anonymizeSignal({ userAgent: "Mozilla/5.0 (Linux; Android 14) Mobile" }).device_type).toBe(
      "mobile",
    );
  });

  test("tablet UAs", () => {
    expect(anonymizeSignal({ userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0)" }).device_type).toBe(
      "tablet",
    );
  });

  test("desktop and missing UAs", () => {
    expect(
      anonymizeSignal({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }).device_type,
    ).toBe("desktop");
    expect(anonymizeSignal({}).device_type).toBe("other");
  });
});

describe("session_hash", () => {
  const day = new Date("2026-10-08T12:00:00Z");

  test("deterministic within a day, rotates across days", () => {
    const a = anonymizeSignal({ ip: "1.2.3.4", userAgent: "ua", now: day });
    const b = anonymizeSignal({ ip: "1.2.3.4", userAgent: "ua", now: day });
    expect(a.session_hash).toBe(b.session_hash);
    expect(a.session_hash).toHaveLength(32);
    const next = anonymizeSignal({
      ip: "1.2.3.4",
      userAgent: "ua",
      now: new Date("2026-10-09T12:00:00Z"),
    });
    expect(next.session_hash).not.toBe(a.session_hash);
  });

  test("null when no IP and no UA", () => {
    expect(anonymizeSignal({}).session_hash).toBeNull();
  });
});

describe("referrer + country", () => {
  test("keeps hostname only", () => {
    expect(
      anonymizeSignal({ referer: "https://example.com/some/path?q=secret" }).referrer_domain,
    ).toBe("example.com");
    expect(anonymizeSignal({ referer: "not a url" }).referrer_domain).toBeNull();
    expect(anonymizeSignal({}).referrer_domain).toBeNull();
  });

  test("validates country codes", () => {
    expect(anonymizeSignal({ country: "de" }).country_code).toBe("DE");
    expect(anonymizeSignal({ country: "USA" }).country_code).toBeNull();
    expect(anonymizeSignal({}).country_code).toBeNull();
  });
});
