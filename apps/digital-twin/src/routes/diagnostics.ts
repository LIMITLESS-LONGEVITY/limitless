import type { FastifyInstance } from 'fastify';
import { eq, desc, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { diagnosticResults, biomarkers } from '../db/schema.js';
import { createDiagnosticSchema } from '../schemas/diagnostic.js';

function assertAccess(request: { user: { id: string } | null; service: { name: string; scopes: string[] } | null }, userId: string) {
  if (request.service) return null;
  if (!request.user) return 401 as const;
  if (request.user.id !== userId) return 403 as const;
  return null;
}

function assertAccessOrService(
  request: {
    user: { id: string } | null;
    service: { name: string; scopes: string[] } | null;
  },
  userId: string,
  requiredScope: string,
): 401 | 403 | null {
  // Service-to-service auth
  if (request.service) {
    const hasScope = request.service.scopes.includes(requiredScope) ||
      request.service.scopes.some((s) => {
        const [action] = requiredScope.split(':');
        return s === `${action}:*`;
      });
    return hasScope ? null : 403;
  }
  // User JWT auth
  if (!request.user) return 401;
  if (request.user.id !== userId) return 403;
  return null;
}

export default async function diagnosticRoutes(fastify: FastifyInstance) {
  // GET /api/twin/:userId/diagnostics — list all
  fastify.get<{ Params: { userId: string } }>(
    '/api/twin/:userId/diagnostics',
    async (request, reply) => {
      const denied = assertAccess(request, request.params.userId);
      if (denied === 401) return reply.code(401).send({ error: 'Unauthorized' });
      if (denied === 403) return reply.code(403).send({ error: 'Forbidden' });

      const { userId } = request.params;

      const results = await db
        .select()
        .from(diagnosticResults)
        .where(eq(diagnosticResults.userId, userId))
        .orderBy(desc(diagnosticResults.performedAt));

      return { data: results };
    },
  );

  // POST /api/twin/:userId/diagnostics — create with optional biomarkers
  // Accepts user JWT (owner) OR service key with write:diagnostics scope
  fastify.post<{ Params: { userId: string }; Body: unknown }>(
    '/api/twin/:userId/diagnostics',
    async (request, reply) => {
      const denied = assertAccessOrService(request, request.params.userId, 'write:diagnostics');
      if (denied === 401) return reply.code(401).send({ error: 'Unauthorized' });
      if (denied === 403) return reply.code(403).send({ error: 'Forbidden' });

      const parsed = createDiagnosticSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Validation failed', details: parsed.error.issues });
      }

      const { userId } = request.params;
      const { biomarkers: biomarkerEntries, ...diagnosticData } = parsed.data;

      // Insert diagnostic result
      const insertedDiag = await db
        .insert(diagnosticResults)
        .values({
          userId,
          ...diagnosticData,
          performedAt: new Date(diagnosticData.performedAt),
        })
        .returning();

      const diagnostic = insertedDiag[0];
      let insertedBiomarkers: unknown[] = [];

      // Optionally batch-create associated biomarkers
      if (biomarkerEntries && biomarkerEntries.length > 0) {
        const rows = biomarkerEntries.map((b) => ({
          userId,
          ...b,
          sourceId: diagnostic.id,
          source: `diagnostic:${diagnostic.packageType}`,
          measuredAt: new Date(b.measuredAt),
        }));

        insertedBiomarkers = await db.insert(biomarkers).values(rows).returning();
      }

      return reply.code(201).send({
        diagnostic,
        biomarkers: insertedBiomarkers,
      });
    },
  );

  // GET /api/twin/:userId/diagnostics/:id — single result with associated biomarkers
  fastify.get<{ Params: { userId: string; id: string } }>(
    '/api/twin/:userId/diagnostics/:id',
    async (request, reply) => {
      const denied = assertAccess(request, request.params.userId);
      if (denied === 401) return reply.code(401).send({ error: 'Unauthorized' });
      if (denied === 403) return reply.code(403).send({ error: 'Forbidden' });

      const { userId, id } = request.params;

      const diagRows = await db
        .select()
        .from(diagnosticResults)
        .where(and(eq(diagnosticResults.id, id), eq(diagnosticResults.userId, userId)))
        .limit(1);

      if (diagRows.length === 0) {
        return reply.code(404).send({ error: 'Diagnostic result not found' });
      }

      const diagnostic = diagRows[0];

      // Fetch associated biomarkers (linked by sourceId)
      const associatedBiomarkers = await db
        .select()
        .from(biomarkers)
        .where(and(eq(biomarkers.userId, userId), eq(biomarkers.sourceId, diagnostic.id)))
        .orderBy(desc(biomarkers.measuredAt));

      return { diagnostic, biomarkers: associatedBiomarkers };
    },
  );
}
