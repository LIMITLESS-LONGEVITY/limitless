import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  healthProfiles,
  biomarkers,
  wearableData,
  wearableSummaries,
  wearableDevices,
  activityLog,
  diagnosticResults,
  genomicData,
  longevityScore,
} from '../db/schema.js';

function assertAccess(request: { user: { id: string } | null; service: { name: string; scopes: string[] } | null }, userId: string) {
  if (request.service) return null;
  if (!request.user) return 401 as const;
  if (request.user.id !== userId) return 403 as const;
  return null;
}

export default async function gdprRoutes(fastify: FastifyInstance) {
  // GET /api/twin/:userId/export — full data export
  fastify.get<{ Params: { userId: string } }>(
    '/api/twin/:userId/export',
    async (request, reply) => {
      const denied = assertAccess(request, request.params.userId);
      if (denied === 401) return reply.code(401).send({ error: 'Unauthorized' });
      if (denied === 403) return reply.code(403).send({ error: 'Forbidden' });

      const { userId } = request.params;

      const [
        profileRows,
        biomarkerRows,
        wearableDataRows,
        wearableSummaryRows,
        wearableDeviceRows,
        activityRows,
        diagnosticRows,
        genomicRows,
        longevityScoreRows,
      ] = await Promise.all([
        db.select().from(healthProfiles).where(eq(healthProfiles.userId, userId)),
        db.select().from(biomarkers).where(eq(biomarkers.userId, userId)),
        db.select().from(wearableData).where(eq(wearableData.userId, userId)),
        db.select().from(wearableSummaries).where(eq(wearableSummaries.userId, userId)),
        db.select().from(wearableDevices).where(eq(wearableDevices.userId, userId)),
        db.select().from(activityLog).where(eq(activityLog.userId, userId)),
        db.select().from(diagnosticResults).where(eq(diagnosticResults.userId, userId)),
        db.select().from(genomicData).where(eq(genomicData.userId, userId)),
        db.select().from(longevityScore).where(eq(longevityScore.userId, userId)),
      ]);

      return {
        exportedAt: new Date().toISOString(),
        userId,
        profile: profileRows[0] ?? null,
        biomarkers: biomarkerRows,
        wearableData: wearableDataRows,
        wearableSummaries: wearableSummaryRows,
        wearableDevices: wearableDeviceRows,
        activityLog: activityRows,
        diagnosticResults: diagnosticRows,
        genomicData: genomicRows,
        longevityScores: longevityScoreRows,
      };
    },
  );

  // DELETE /api/twin/:userId — cascade delete all user data
  fastify.delete<{ Params: { userId: string } }>(
    '/api/twin/:userId',
    async (request, reply) => {
      const denied = assertAccess(request, request.params.userId);
      if (denied === 401) return reply.code(401).send({ error: 'Unauthorized' });
      if (denied === 403) return reply.code(403).send({ error: 'Forbidden' });

      const { userId } = request.params;

      // Delete from all tables in parallel
      await Promise.all([
        db.delete(biomarkers).where(eq(biomarkers.userId, userId)),
        db.delete(wearableData).where(eq(wearableData.userId, userId)),
        db.delete(wearableSummaries).where(eq(wearableSummaries.userId, userId)),
        db.delete(wearableDevices).where(eq(wearableDevices.userId, userId)),
        db.delete(activityLog).where(eq(activityLog.userId, userId)),
        db.delete(diagnosticResults).where(eq(diagnosticResults.userId, userId)),
        db.delete(genomicData).where(eq(genomicData.userId, userId)),
        db.delete(longevityScore).where(eq(longevityScore.userId, userId)),
      ]);

      // Delete profile last (primary record)
      await db.delete(healthProfiles).where(eq(healthProfiles.userId, userId));

      return reply.code(200).send({ deleted: true, userId });
    },
  );
}
