import type { FastifyInstance } from 'fastify';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { db } from '../db/client.js';
import { wearableSummaries, wearableData } from '../db/schema.js';
import { summariesQuerySchema, wearableDataQuerySchema } from '../schemas/wearable.js';
import { withAttribution } from '../services/data-attribution.js';

function assertAccess(request: { user: { id: string } | null; service: { name: string; scopes: string[] } | null }, userId: string) {
  if (request.service) return null;
  if (!request.user) return 401 as const;
  if (String(request.user.id) !== String(userId)) return 403 as const;
  return null;
}

export default async function wearableDataRoutes(fastify: FastifyInstance) {
  // GET /api/twin/:userId/wearable-summaries
  fastify.get<{ Params: { userId: string }; Querystring: Record<string, string> }>(
    '/api/twin/:userId/wearable-summaries',
    async (request, reply) => {
      const denied = assertAccess(request, request.params.userId);
      if (denied === 401) return reply.code(401).send({ error: 'Unauthorized' });
      if (denied === 403) return reply.code(403).send({ error: 'Forbidden' });

      const parsed = summariesQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Validation failed', details: parsed.error.issues });
      }

      const { userId } = request.params;
      const { startDate, endDate, provider } = parsed.data;

      const conditions = [eq(wearableSummaries.userId, userId)];
      if (startDate) conditions.push(gte(wearableSummaries.date, startDate));
      if (endDate) conditions.push(lte(wearableSummaries.date, endDate));
      if (provider) conditions.push(eq(wearableSummaries.provider, provider));

      const rows = await db
        .select()
        .from(wearableSummaries)
        .where(and(...conditions))
        .orderBy(desc(wearableSummaries.date))
        .limit(90);

      return { summaries: rows.map(withAttribution) };
    },
  );

  // GET /api/twin/:userId/wearable-data
  fastify.get<{ Params: { userId: string }; Querystring: Record<string, string> }>(
    '/api/twin/:userId/wearable-data',
    async (request, reply) => {
      const denied = assertAccess(request, request.params.userId);
      if (denied === 401) return reply.code(401).send({ error: 'Unauthorized' });
      if (denied === 403) return reply.code(403).send({ error: 'Forbidden' });

      const parsed = wearableDataQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Validation failed', details: parsed.error.issues });
      }

      const { userId } = request.params;
      const { metric, startDate, endDate } = parsed.data;

      const conditions = [eq(wearableData.userId, userId)];
      if (metric) conditions.push(eq(wearableData.metric, metric));
      if (startDate) conditions.push(gte(wearableData.time, new Date(`${startDate}T00:00:00Z`)));
      if (endDate) conditions.push(lte(wearableData.time, new Date(`${endDate}T23:59:59Z`)));

      const rows = await db
        .select()
        .from(wearableData)
        .where(and(...conditions))
        .orderBy(desc(wearableData.time))
        .limit(1000);

      return { data: rows };
    },
  );
}
