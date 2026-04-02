import type { FastifyInstance } from 'fastify';
import { eq, desc, gte, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { healthProfiles, biomarkers, wearableSummaries } from '../db/schema.js';
import { updateProfileSchema } from '../schemas/profile.js';
import { calculateTrend } from '../services/trend.js';

function assertAccess(request: { user: { id: string } | null; service: { name: string; scopes: string[] } | null }, userId: string) {
  // Service keys with appropriate scopes bypass user ownership check
  if (request.service) return null;
  if (!request.user) return 401 as const;
  if (String(request.user.id) !== String(userId)) return 403 as const;
  return null;
}

export default async function profileRoutes(fastify: FastifyInstance) {
  // GET /api/twin/:userId/profile
  fastify.get<{ Params: { userId: string } }>(
    '/api/twin/:userId/profile',
    async (request, reply) => {
      const denied = assertAccess(request, request.params.userId);
      if (denied === 401) return reply.code(401).send({ error: 'Unauthorized' });
      if (denied === 403) return reply.code(403).send({ error: 'Forbidden' });

      const { userId } = request.params;
      const rows = await db
        .select()
        .from(healthProfiles)
        .where(eq(healthProfiles.userId, userId))
        .limit(1);

      if (rows.length === 0) {
        return reply.code(404).send({ error: 'Profile not found' });
      }

      return rows[0];
    },
  );

  // PATCH /api/twin/:userId/profile — upsert
  fastify.patch<{ Params: { userId: string }; Body: unknown }>(
    '/api/twin/:userId/profile',
    async (request, reply) => {
      const denied = assertAccess(request, request.params.userId);
      if (denied === 401) return reply.code(401).send({ error: 'Unauthorized' });
      if (denied === 403) return reply.code(403).send({ error: 'Forbidden' });

      const parsed = updateProfileSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Validation failed', details: parsed.error.issues });
      }

      const { userId } = request.params;
      const data = parsed.data;

      // Check if profile exists
      const existing = await db
        .select({ id: healthProfiles.id })
        .from(healthProfiles)
        .where(eq(healthProfiles.userId, userId))
        .limit(1);

      if (existing.length === 0) {
        // Create
        const inserted = await db
          .insert(healthProfiles)
          .values({ userId, ...data })
          .returning();
        return reply.code(201).send(inserted[0]);
      }

      // Update
      const updated = await db
        .update(healthProfiles)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(healthProfiles.userId, userId))
        .returning();

      return updated[0];
    },
  );

  // GET /api/twin/:userId/summary
  fastify.get<{ Params: { userId: string } }>(
    '/api/twin/:userId/summary',
    async (request, reply) => {
      const denied = assertAccess(request, request.params.userId);
      if (denied === 401) return reply.code(401).send({ error: 'Unauthorized' });
      if (denied === 403) return reply.code(403).send({ error: 'Forbidden' });

      const { userId } = request.params;

      // Calculate date 7 days ago for wearable window
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

      const [profileRows, latestBiomarkers, recentWearables] = await Promise.all([
        db
          .select()
          .from(healthProfiles)
          .where(eq(healthProfiles.userId, userId))
          .limit(1),
        db
          .select()
          .from(biomarkers)
          .where(eq(biomarkers.userId, userId))
          .orderBy(desc(biomarkers.measuredAt))
          .limit(10),
        db
          .select()
          .from(wearableSummaries)
          .where(
            and(
              eq(wearableSummaries.userId, userId),
              gte(wearableSummaries.date, sevenDaysAgoStr),
            ),
          )
          .orderBy(desc(wearableSummaries.date)),
      ]);

      // Calculate biomarker trends: for each unique biomarker in latest 10,
      // fetch its full history and compute trend
      const uniqueNames = [...new Set(latestBiomarkers.map((b) => b.name))];
      const biomarkerTrends: Record<string, string | null> = {};

      if (uniqueNames.length > 0) {
        // Fetch history for each unique biomarker name
        const trendResults = await Promise.all(
          uniqueNames.map(async (name) => {
            const history = await db
              .select()
              .from(biomarkers)
              .where(and(eq(biomarkers.userId, userId), eq(biomarkers.name, name)))
              .orderBy(desc(biomarkers.measuredAt))
              .limit(10);

            const optimalRange = history.length > 0
              ? { optimalMin: history[0].optimalMin, optimalMax: history[0].optimalMax }
              : undefined;

            const trend = calculateTrend(
              history.map((r) => ({ value: r.value, measuredAt: r.measuredAt })),
              optimalRange,
            );

            return { name, trend };
          }),
        );

        for (const { name, trend } of trendResults) {
          biomarkerTrends[name] = trend;
        }
      }

      // Compute wearable insights from last 7 days
      const wearableInsights = computeWearableInsights(recentWearables);

      return {
        profile: profileRows[0] ?? null,
        recentBiomarkers: latestBiomarkers,
        biomarkerTrends,
        wearableInsights,
      };
    },
  );
}

// ---------------------------------------------------------------------------
// Wearable insights (7-day window)
// ---------------------------------------------------------------------------

interface WearableSummaryRow {
  sleepDuration: number | null;
  sleepEfficiency: number | null;
  sleepScore: number | null;
  hrvAvg: number | null;
  heartRateResting: number | null;
  steps: number | null;
  activeMinutes: number | null;
  recoveryScore: number | null;
  stressScore: number | null;
}

function computeWearableInsights(rows: WearableSummaryRow[]) {
  if (rows.length === 0) {
    return {
      days: 0,
      avgSleepDuration: null,
      avgSleepEfficiency: null,
      avgSleepScore: null,
      avgHRV: null,
      avgRestingHR: null,
      avgSteps: null,
      avgActiveMinutes: null,
      avgRecoveryScore: null,
      avgStressScore: null,
      recoveryTrend: null,
    };
  }

  const avg = (arr: number[]) =>
    arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;

  const extract = (fn: (r: WearableSummaryRow) => number | null) =>
    rows.map(fn).filter((v): v is number => v !== null);

  const recoveryVals = extract((r) => r.recoveryScore);
  let recoveryTrend: string | null = null;
  if (recoveryVals.length >= 2) {
    const mid = Math.floor(recoveryVals.length / 2);
    // rows are ordered desc (newest first), so slice(0, mid) = newer
    const newer = recoveryVals.slice(0, mid);
    const older = recoveryVals.slice(mid);
    const newerAvg = avg(newer)!;
    const olderAvg = avg(older)!;
    if (newerAvg > olderAvg + 2) recoveryTrend = 'improving';
    else if (newerAvg < olderAvg - 2) recoveryTrend = 'declining';
    else recoveryTrend = 'stable';
  }

  return {
    days: rows.length,
    avgSleepDuration: avg(extract((r) => r.sleepDuration)),
    avgSleepEfficiency: avg(extract((r) => r.sleepEfficiency)),
    avgSleepScore: avg(extract((r) => r.sleepScore)),
    avgHRV: avg(extract((r) => r.hrvAvg)),
    avgRestingHR: avg(extract((r) => r.heartRateResting)),
    avgSteps: avg(extract((r) => r.steps)),
    avgActiveMinutes: avg(extract((r) => r.activeMinutes)),
    avgRecoveryScore: avg(extract((r) => r.recoveryScore)),
    avgStressScore: avg(extract((r) => r.stressScore)),
    recoveryTrend,
  };
}
