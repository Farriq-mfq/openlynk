import type { DeviceType } from "@openlynk/shared";

export interface AnonymizedSignal {
  device_type: DeviceType;
  session_hash: string | null;
  referrer_domain: string | null;
  country_code: string | null;
}

export interface RawSignal {
  ip?: string | null;
  userAgent?: string | null;
  referer?: string | null;
  country?: string | null;
  now?: Date;
}

function detectDevice(userAgent: string | null | undefined): DeviceType {
  if (!userAgent) return "other";
  if (/tablet|ipad/i.test(userAgent)) return "tablet";
  if (/mobi|android|iphone|ipod|phone/i.test(userAgent)) return "mobile";
  return "desktop";
}

function hashSession(ip: string | null | undefined, ua: string | null | undefined, day: string): string | null {
  if (!ip && !ua) return null;
  const salt = process.env.ANALYTICS_SALT ?? "dev-analytics-salt";
  return new Bun.CryptoHasher("sha256", `${salt}:${day}`)
    .update(`${ip ?? ""}|${ua ?? ""}`)
    .digest("hex")
    .slice(0, 32);
}

function parseReferrerDomain(referer: string | null | undefined): string | null {
  if (!referer) return null;
  try {
    return new URL(referer).hostname.toLowerCase().slice(0, 255) || null;
  } catch {
    return null;
  }
}

function parseCountry(country: string | null | undefined): string | null {
  if (!country || !/^[A-Za-z]{2}$/.test(country.trim())) return null;
  return country.trim().toUpperCase();
}

// Derive-then-drop: raw IP/UA are consumed in memory and never persisted or logged.
export function anonymizeSignal(raw: RawSignal): AnonymizedSignal {
  const day = (raw.now ?? new Date()).toISOString().slice(0, 10);
  return {
    device_type: detectDevice(raw.userAgent),
    session_hash: hashSession(raw.ip, raw.userAgent, day),
    referrer_domain: parseReferrerDomain(raw.referer),
    country_code: parseCountry(raw.country),
  };
}
