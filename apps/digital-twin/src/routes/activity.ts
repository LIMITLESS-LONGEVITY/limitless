import type { FastifyInstance } from 'fastify';
import { eq, desc, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { activityLog } from '../db/schema.js';
import { createActivitySchema } from '../schemas/activity.js';

function assertAuth(
  request: { user: { id: string } | null; service: { name: string; scopes: string[] } | null },
  userId: string,
  requiredScope?: string,
): 401 | 403 | null {
  // Service-to-service auth
  if (request.service) {
    if (requiredScope && !hasScope(request.service.scopes, requiredScope)) {
      return 403;
    }
    return null;
  }

  // User JWT auth
  if (!request.user) return 401;
  if (request.user.id !== userId) return 403;
  return null;
}

function hasScope(scopes: string[], required: string): boolean {
  if (scopes.includes(required)) return true;
  // Check wildcard: 'read:*' matches 'read:anything'
  const [action] = required.split(':');
  return scopes.includes(`${action}:*`);
}

export default async function activityRoutes(fastify: FastifyInstance) {
  // POST /api/twin/:userId/activity — log event
  fastify.post<{ Params: { userId: string }; Body: unknown }>(
    '/api/twin/:userId/activity',
    async (request, reply) => {
      const denied = assertAuth(request, request.params.userId, 'write:activity');
      if (denied === 401) return reply.code(401).send({ error: 'Unauthorized' });
      if (denied === 403) return reply.code(403).send({ error: 'Forbidden' });

      const parsed = createActivitySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Validation failed', details: parsed.error.issues });
      }

      const { userId } = request.params;
      const { source, eventType, metadata, occurredAt } = parsed.data;

      const inserted = await db
        .insert(activityLog)
        .values({
          userId,
          source,
          eventType,
          metadata: metadata ?? {},
          occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
        })
        .returning();

      return reply.code(201).send(inserted[0]);
    },
  );

  // GET /api/twin/:userId/activity — paginated list
  fastify.get<{
    Params: { userId: string };
    Querystring: { limit?: string; offset?: string; source?: string };
  }>(
    '/api/twin/:userId/activity',
    async (request, reply) => {
      const denied = assertAuth(request, request.params.userId, 'read:*');
      if (denied === 401) return reply.code(401).send({ error: 'Unauthorized' });
      if (denied === 403) return reply.code(403).send({ error: 'Forbidden' });

      const { userId } = request.params;
      const limit = Math.min(parseInt(request.query.limit || '20', 10), 200);
      const offset = parseInt(request.query.offset || '0', 10);
      const { source } = request.query;

      const conditions = [eq(activityLog.userId, userId)];
      if (source) conditions.push(eq(activityLog.source, source));

      const results = await db
        .select()
        .from(activityLog)
        .where(and(...conditions))
        .orderBy(desc(activityLog.occurredAt))
        .limit(limit)
        .offset(offset);

      return { data: results, limit, offset };
    },
  );
}
