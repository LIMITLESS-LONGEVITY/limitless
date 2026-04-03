import type { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { consents } from '../db/consents-schema.js';
import { z } from 'zod';

const VALID_PURPOSES = [
  'wearable_sync',
  'biomarker_storage',
  'ai_analysis',
  'longevity_score',
  'clinician_access',
] as const;

const grantConsentSchema = z.object({
  purpose: z.enum(VALID_PURPOSES),
  granted: z.literal(true),
});

function assertAccess(
  request: { user: { id: string; role?: string } | null; service: { name: string; scopes: string[] } | null },
  userId: string,
) {
  if (request.service) return null;
  if (!request.user) return 401 as const;
  if (request.user.role === 'admin') return null;
  if (request.user.id !== userId) return 403 as const;
  return null;
}

export default async function consentRoutes(fastify: FastifyInstance) {
  // GET /api/twin/:userId/consents — list all consents
  fastify.get<{ Params: { userId: string } }>(
    '/api/twin/:userId/consents',
    async (request, reply) => {
      const denied = assertAccess(request, request.params.userId);
      if (denied === 401) return reply.code(401).send({ error: 'Unauthorized' });
      if (denied === 403) return reply.code(403).send({ error: 'Forbidden' });

      const rows = await db
        .select()
        .from(consents)
        .where(eq(consents.userId, request.params.userId));

      return { consents: rows };
    },
  );

  // POST /api/twin/:userId/consents — grant consent
  fastify.post<{ Params: { userId: string }; Body: unknown }>(
    '/api/twin/:userId/consents',
    async (request, reply) => {
      const denied = assertAccess(request, request.params.userId);
      if (denied === 401) return reply.code(401).send({ error: 'Unauthorized' });
      if (denied === 403) return reply.code(403).send({ error: 'Forbidden' });

      const parsed = grantConsentSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Validation failed', details: parsed.error.issues });
      }

      const { userId } = request.params;
      const { purpose } = parsed.data;
      const now = new Date();

      const row = await db
        .insert(consents)
        .values({
          userId,
          purpose,
          granted: true,
          grantedAt: now,
        })
        .onConflictDoUpdate({
          target: [consents.userId, consents.purpose],
          set: {
            granted: true,
            grantedAt: now,
            withdrawnAt: null,
          },
        })
        .returning();

      return { consent: row[0] };
    },
  );

  // PATCH /api/twin/:userId/consents/:purpose — withdraw consent
  fastify.patch<{ Params: { userId: string; purpose: string } }>(
    '/api/twin/:userId/consents/:purpose',
    async (request, reply) => {
      const denied = assertAccess(request, request.params.userId);
      if (denied === 401) return reply.code(401).send({ error: 'Unauthorized' });
      if (denied === 403) return reply.code(403).send({ error: 'Forbidden' });

      const { userId, purpose } = request.params;

      if (!VALID_PURPOSES.includes(purpose as typeof VALID_PURPOSES[number])) {
        return reply.code(400).send({ error: `Invalid purpose: ${purpose}` });
      }

      const now = new Date();
      const updated = await db
        .update(consents)
        .set({
          granted: false,
          withdrawnAt: now,
        })
        .where(and(eq(consents.userId, userId), eq(consents.purpose, purpose)))
        .returning();

      if (updated.length === 0) {
        return reply.code(404).send({ error: 'Consent record not found' });
      }

      return { consent: updated[0] };
    },
  );
}
