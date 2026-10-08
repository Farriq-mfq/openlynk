import type { AnalyticsSummary, LinkAnalytics } from "@openlynk/shared";

export type AnalyticsRange = "7d" | "30d";

export function useAnalytics() {
  const range = useState<AnalyticsRange>("analytics:range", () => "7d");
  const summary = useState<AnalyticsSummary | null>("analytics:summary", () => null);
  const perLink = useState<LinkAnalytics[]>("analytics:links", () => []);
  const pending = useState<boolean>("analytics:pending", () => false);
  const api = useApi();

  async function fetchAnalytics(): Promise<void> {
    pending.value = true;
    try {
      const [s, l] = await Promise.all([
        api<AnalyticsSummary>("/analytics/summary", { query: { range: range.value } }),
        api<{ links: LinkAnalytics[] }>("/analytics/links"),
      ]);
      summary.value = s;
      perLink.value = l.links;
    } finally {
      pending.value = false;
    }
  }

  return { range, summary, perLink, pending, fetchAnalytics };
}
