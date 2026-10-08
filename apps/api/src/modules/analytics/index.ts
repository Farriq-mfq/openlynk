import { Elysia } from "elysia";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { AnalyticsRangeQuerySchema } from "@openlynk/shared";
import { db } from "../../db";
import { linkClicks, links, profileViews } from "../../db/schema";
import { apiError } from "../../lib/http";
import { resolveAdminId } from "../../middlewares/auth";
import { getAdminProfile } from "../../middlewares/ownership";

function dayKeys(days: number): string[] {
  const keys: string[] = [];
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const t = new Date(d);
    t.setUTCDate(d.getUTCDate() - i);
    keys.push(t.toISOString().slice(0, 10));
  }
  return keys;
}

// date_trunc() arrives as a string through raw sql fragments (Drizzle only
// auto-maps declared timestamp columns). Accept both shapes.
function dayKey(day: Date | string): string {
  const d = day instanceof Date ? day : new Date(day);
  return d.toISOString().slice(0, 10);
}

export const analyticsModule = new Elysia({ prefix: "/analytics" })
  .derive(async ({ cookie }) => ({ adminId: await resolveAdminId(cookie) }))
  .onBeforeHandle(({ adminId, status }) => {
    if (!adminId) return status(401, apiError("UNAUTHORIZED", "Authentication required"));
  })
  .get(
    "/summary",
    async ({ query, adminId, status }) => {
      const profile = await getAdminProfile(adminId as string);
      if (!profile) return status(404, apiError("PROFILE_NOT_FOUND", "Profile not found"));
      const days = query.range === "30d" ? 30 : 7;
      const since = new Date();
      since.setUTCHours(0, 0, 0, 0);
      since.setUTCDate(since.getUTCDate() - (days - 1));

      // Aggregation needs SQL date_trunc; all filters stay parameterized via drizzle.
      const viewDay = sql`date_trunc('day', ${profileViews.viewed_at})`;
      const viewRows = await db
        .select({
          day: sql<Date | string>`${viewDay}`,
          total: sql<number>`count(*)`.mapWith(Number),
          unique: sql<number>`count(distinct ${profileViews.session_hash})`.mapWith(Number),
        })
        .from(profileViews)
        .where(and(eq(profileViews.profile_id, profile.id), gte(profileViews.viewed_at, since)))
        .groupBy(viewDay);

      const clickDay = sql`date_trunc('day', ${linkClicks.clicked_at})`;
      const clickRows = await db
        .select({
          day: sql<Date | string>`${clickDay}`,
          total: sql<number>`count(*)`.mapWith(Number),
          unique: sql<number>`count(distinct ${linkClicks.session_hash})`.mapWith(Number),
        })
        .from(linkClicks)
        .where(and(eq(linkClicks.profile_id, profile.id), gte(linkClicks.clicked_at, since)))
        .groupBy(clickDay);

      const byDay = new Map<string, { views: number; uv: number; clicks: number; uc: number }>();
      for (const r of viewRows) {
        const k = dayKey(r.day);
        byDay.set(k, { views: r.total, uv: r.unique, clicks: 0, uc: 0 });
      }
      for (const r of clickRows) {
        const k = dayKey(r.day);
        const e = byDay.get(k) ?? { views: 0, uv: 0, clicks: 0, uc: 0 };
        e.clicks = r.total;
        e.uc = r.unique;
        byDay.set(k, e);
      }

      const points = dayKeys(days).map((day) => {
        const e = byDay.get(day) ?? { views: 0, uv: 0, clicks: 0, uc: 0 };
        return {
          day,
          views: e.views,
          unique_views: e.uv,
          clicks: e.clicks,
          unique_clicks: e.uc,
        };
      });
      return {
        range: query.range ?? "7d",
        points,
        total_views: points.reduce((s, p) => s + p.views, 0),
        total_clicks: points.reduce((s, p) => s + p.clicks, 0),
      };
    },
    { query: AnalyticsRangeQuerySchema },
  )
  .get("/links", async ({ adminId, status }) => {
    const profile = await getAdminProfile(adminId as string);
    if (!profile) return status(404, apiError("PROFILE_NOT_FOUND", "Profile not found"));
    const rows = await db
      .select({
        link_id: linkClicks.link_id,
        title: links.title,
        clicks: sql<number>`count(*)`.mapWith(Number),
        unique_clicks: sql<number>`count(distinct ${linkClicks.session_hash})`.mapWith(Number),
      })
      .from(linkClicks)
      .innerJoin(links, eq(linkClicks.link_id, links.id))
      .where(eq(linkClicks.profile_id, profile.id))
      .groupBy(linkClicks.link_id, links.title)
      .orderBy(desc(sql`count(*)`));
    return { links: rows };
  });
