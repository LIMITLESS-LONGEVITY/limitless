import type { FastifyInstance } from 'fastify';
import { eq, desc, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { biomarkers } from '../db/schema.js';
import { createBiomarkerSchema, batchCreateBiomarkersSchema } from '../schemas/biomarker.js';
import { calculateTrend } from '../services/trend.js';
import { calculateLongevityScore } from '../services/longevity-score.js';

function assertAccess(request: { user: { id: string } | null; service: { name: string; scopes: string[] } | null }, userId: string) {
  if (request.service) return null;
  if (!request.user) return 401 as const;
  if (String(request.user.id) !== String(userId)) return 403 as const;
  return null;
}

export default async function biomarkerRoutes(fastify: FastifyInstance) {
  // GET /api/twin/:userId/biomarkers — paginated, filterable
  fastify.get<{
    Params: { userId: string };
    Querystring: { limit?: string; offset?: string; category?: string; name?: string };
  }>(
    '/api/twin/:userId/biomarkers',
    async (request, reply) => {
      const denied = assertAccess(request, request.params.userId);
      if (denied === 401) return reply.code(401).send({ error: 'Unauthorized' });
      if (denied === 403) return reply.code(403).send({ error: 'Forbidden' });

      const { userId } = request.params;
      const limit = Math.min(parseInt(request.query.limit || '50', 10), 200);
      const offset = parseInt(request.query.offset || '0', 10);
      const { category, name } = request.query;

      const conditions = [eq(biomarkers.userId, userId)];
      if (category) conditions.push(eq(biomarkers.category, category));
      if (name) conditions.push(eq(biomarkers.name, name));

      const results = await db
        .select()
        .from(biomarkers)
        .where(and(...conditions))
        .orderBy(desc(biomarkers.measuredAt))
        .limit(limit)
        .offset(offset);

      return { data: results, limit, offset };
    },
  );

  // GET /api/twin/:userId/biomarkers/:name — history for a single biomarker
  fastify.get<{ Params: { userId: string; name: string } }>(
    '/api/twin/:userId/biomarkers/:name',
    async (request, reply) => {
      const denied = assertAccess(request, request.params.userId);
      if (denied === 401) return reply.code(401).send({ error: 'Unauthorized' });
      if (denied === 403) return reply.code(403).send({ error: 'Forbidden' });

      const { userId, name } = request.params;

      const results = await db
        .select()
        .from(biomarkers)
        .where(and(eq(biomarkers.userId, userId), eq(biomarkers.name, name)))
        .orderBy(desc(biomarkers.measuredAt));

      // Calculate trend from history
      const optimalRange = results.length > 0
        ? { optimalMin: results[0].optimalMin, optimalMax: results[0].optimalMax }
        : undefined;

      const trend = calculateTrend(
        results.map((r) => ({ value: r.value, measuredAt: r.measuredAt })),
        optimalRange,
      );

      return { data: results, trend };
    },
  );

  // POST /api/twin/:userId/biomarkers — create single
  fastify.post<{ Params: { userId: string }; Body: unknown }>(
    '/api/twin/:userId/biomarkers',
    async (request, reply) => {
      const denied = assertAccess(request, request.params.userId);
      if (denied === 401) return reply.code(401).send({ error: 'Unauthorized' });
      if (denied === 403) return reply.code(403).send({ error: 'Forbidden' });

      const parsed = createBiomarkerSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Validation failed', details: parsed.error.issues });
      }

      const { userId } = request.params;
      const inserted = await db
        .insert(biomarkers)
        .values({
          userId,
          ...parsed.data,
          measuredAt: new Date(parsed.data.measuredAt),
        })
        .returning();

      // Recalculate longevity score in background (fire-and-forget)
      calculateLongevityScore(userId).catch((err) => {
        fastify.log.error(err, `Failed to recalculate longevity score for user ${userId}`);
      });

      return reply.code(201).send(inserted[0]);
    },
  );

  // POST /api/twin/:userId/biomarkers/batch — create multiple
  fastify.post<{ Params: { userId: string }; Body: unknown }>(
    '/api/twin/:userId/biomarkers/batch',
    async (request, reply) => {
      const denied = assertAccess(request, request.params.userId);
      if (denied === 401) return reply.code(401).send({ error: 'Unauthorized' });
      if (denied === 403) return reply.code(403).send({ error: 'Forbidden' });

      const parsed = batchCreateBiomarkersSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Validation failed', details: parsed.error.issues });
      }

      const { userId } = request.params;
      const rows = parsed.data.biomarkers.map((b) => ({
        userId,
        ...b,
        measuredAt: new Date(b.measuredAt),
      }));

      const inserted = await db.insert(biomarkers).values(rows).returning();

      // Recalculate longevity score in background (fire-and-forget)
      calculateLongevityScore(userId).catch((err) => {
        fastify.log.error(err, `Failed to recalculate longevity score for user ${userId}`);
      });

      return reply.code(201).send({ data: inserted, count: inserted.length });
    },
  );
}
