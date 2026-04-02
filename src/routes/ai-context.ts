import type { FastifyInstance } from 'fastify';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  healthProfiles,
  biomarkers,
  wearableSummaries,
  activityLog,
  stayContext,
} from '../db/schema.js';

function assertAccess(request: { user: { id: string } | null; service: { name: string; scopes: string[] } | null }, userId: string) {
  if (request.service) return null;
  if (!request.user) return 401 as const;
  if (String(request.user.id) !== String(userId)) return 403 as const;
  return null;
}

export default async function aiContextRoutes(fastify: FastifyInstance) {
  // GET /api/twin/:userId/ai-context
  fastify.get<{ Params: { userId: string } }>(
    '/api/twin/:userId/ai-context',
    async (request, reply) => {
      const denied = assertAccess(request, request.params.userId);
      if (denied === 401) return reply.code(401).send({ error: 'Unauthorized' });
      if (denied === 403) return reply.code(403).send({ error: 'Forbidden' });

      const { userId } = request.params;

      const [profileRows, recentBiomarkerRows, wearableRows, activityRows, stayRows] = await Promise.all([
        db
          .select()
          .from(healthProfiles)
          .where(eq(healthProfiles.userId, userId))
          .limit(1),
        db
          .select({
            name: biomarkers.name,
            value: biomarkers.value,
            unit: biomarkers.unit,
            status: biomarkers.status,
            measuredAt: biomarkers.measuredAt,
          })
          .from(biomarkers)
          .where(eq(biomarkers.userId, userId))
          .orderBy(desc(biomarkers.measuredAt))
          .limit(20),
        db
          .select()
          .from(wearableSummaries)
          .where(eq(wearableSummaries.userId, userId))
          .orderBy(desc(wearableSummaries.date))
          .limit(7),
        db
          .select({
            source: activityLog.source,
            eventType: activityLog.eventType,
            occurredAt: activityLog.occurredAt,
          })
          .from(activityLog)
          .where(eq(activityLog.userId, userId))
          .orderBy(desc(activityLog.occurredAt))
          .limit(20),
        db
          .select()
          .from(stayContext)
          .where(
            and(
              eq(stayContext.userId, userId),
              inArray(stayContext.status, ['active', 'upcoming']),
            ),
          )
          .limit(1),
      ]);

      const profile = profileRows[0] ?? null;

      // Compute wearable insights from recent summaries
      const wearableInsights = computeWearableInsights(wearableRows);

      // Compute active stay context
      let activeStay: { stayType: string; stayLocation: string; startDate: Date; endDate: Date; dayNumber: number | null; phase: string } | null = null;
      if (stayRows.length > 0) {
        const stay = stayRows[0];
        const now = new Date();
        const start = new Date(stay.startDate);
        const end = new Date(stay.endDate);
        let phase = 'pre-arrival';
        let dayNumber: number | null = null;
        if (now >= start && now <= end) {
          phase = 'during-stay';
          dayNumber = Math.floor((now.getTime() - start.getTime()) / 86400000) + 1;
        } else if (now > end) {
          phase = 'post-stay';
        }
        activeStay = {
          stayType: stay.stayType,
          stayLocation: stay.stayLocation,
          startDate: stay.startDate,
          endDate: stay.endDate,
          dayNumber,
          phase,
        };
      }

      return {
        profile: profile
          ? {
              age: profile.chronologicalAge,
              sex: profile.biologicalSex,
              conditions: profile.conditions,
              goals: profile.healthGoals,
              pillarPriorities: profile.pillarPriorities,
            }
          : null,
        recentBiomarkers: recentBiomarkerRows,
        wearableInsights,
        recentActivity: activityRows,
        activeStay,
      };
    },
  );
}

interface WearableSummaryRow {
  sleepDuration: number | null;
  hrvAvg: number | null;
  recoveryScore: number | null;
}

function computeWearableInsights(rows: WearableSummaryRow[]) {
  if (rows.length === 0) {
    return { avgSleep: null, avgHRV: null, recoveryTrend: null };
  }

  const sleepVals = rows.map((r) => r.sleepDuration).filter((v): v is number => v !== null);
  const hrvVals = rows.map((r) => r.hrvAvg).filter((v): v is number => v !== null);
  const recoveryVals = rows.map((r) => r.recoveryScore).filter((v): v is number => v !== null);

  const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

  // Recovery trend: compare first half vs second half of recent data
  let recoveryTrend: string | null = null;
  if (recoveryVals.length >= 2) {
    const mid = Math.floor(recoveryVals.length / 2);
    const older = recoveryVals.slice(mid);
    const newer = recoveryVals.slice(0, mid);
    const olderAvg = avg(older)!;
    const newerAvg = avg(newer)!;
    if (newerAvg > olderAvg + 2) recoveryTrend = 'improving';
    else if (newerAvg < olderAvg - 2) recoveryTrend = 'declining';
    else recoveryTrend = 'stable';
  }

  return {
    avgSleep: avg(sleepVals),
    avgHRV: avg(hrvVals),
    recoveryTrend,
  };
}
