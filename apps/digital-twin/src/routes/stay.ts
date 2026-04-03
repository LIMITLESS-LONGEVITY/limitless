import type { FastifyInstance } from 'fastify';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import { stayContext } from '../db/schema.js';
import { z } from 'zod';

function assertAccess(request: { user: { id: string } | null; service: { name: string; scopes: string[] } | null }, userId: string) {
  if (request.service) return null;
  if (!request.user) return 401 as const;
  if (request.user.id !== userId) return 403 as const;
  return null;
}

const createStaySchema = z.object({
  hubStayBookingId: z.string().optional(),
  stayType: z.enum(['3-day', '5-day', '7-day']),
  stayLocation: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  followUpMonths: z.number().int().positive().optional(),
  status: z.enum(['upcoming', 'active', 'completed', 'follow-up']).default('upcoming'),
  metadata: z.record(z.unknown()).optional(),
});

const updateStaySchema = createStaySchema.partial();

export default async function stayRoutes(fastify: FastifyInstance) {
  // GET /api/twin/:userId/stay/active — current active stay (or most recent upcoming)
  fastify.get<{ Params: { userId: string } }>(
    '/api/twin/:userId/stay/active',
    async (request, reply) => {
      const denied = assertAccess(request, request.params.userId);
      if (denied === 401) return reply.code(401).send({ error: 'Unauthorized' });
      if (denied === 403) return reply.code(403).send({ error: 'Forbidden' });

      const { userId } = request.params;

      const rows = await db
        .select()
        .from(stayContext)
        .where(
          and(
            eq(stayContext.userId, userId),
            inArray(stayContext.status, ['active', 'upcoming']),
          ),
        )
        .limit(1);

      if (rows.length === 0) {
        return { stay: null };
      }

      const stay = rows[0];
      const now = new Date();
      const start = new Date(stay.startDate);
      const end = new Date(stay.endDate);

      let phase: string | null = null;
      let dayNumber: number | null = null;

      if (now < start) {
        phase = 'pre-arrival';
      } else if (now <= end) {
        phase = 'during-stay';
        dayNumber = Math.floor((now.getTime() - start.getTime()) / 86400000) + 1;
      } else {
        phase = 'post-stay';
      }

      return {
        stay: {
          ...stay,
          phase,
          dayNumber,
        },
      };
    },
  );

  // POST /api/twin/:userId/stay — create stay record
  fastify.post<{ Params: { userId: string }; Body: unknown }>(
    '/api/twin/:userId/stay',
    async (request, reply) => {
      const denied = assertAccess(request, request.params.userId);
      if (denied === 401) return reply.code(401).send({ error: 'Unauthorized' });
      if (denied === 403) return reply.code(403).send({ error: 'Forbidden' });

      const parsed = createStaySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Validation failed', details: parsed.error.issues });
      }

      const { userId } = request.params;
      const data = parsed.data;

      const rows = await db
        .insert(stayContext)
        .values({
          userId,
          hubStayBookingId: data.hubStayBookingId,
          stayType: data.stayType,
          stayLocation: data.stayLocation,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          followUpMonths: data.followUpMonths,
          status: data.status,
          metadata: data.metadata,
        })
        .returning();

      return reply.code(201).send(rows[0]);
    },
  );

  // PATCH /api/twin/:userId/stay/:id — update stay
  fastify.patch<{ Params: { userId: string; id: string }; Body: unknown }>(
    '/api/twin/:userId/stay/:id',
    async (request, reply) => {
      const denied = assertAccess(request, request.params.userId);
      if (denied === 401) return reply.code(401).send({ error: 'Unauthorized' });
      if (denied === 403) return reply.code(403).send({ error: 'Forbidden' });

      const parsed = updateStaySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Validation failed', details: parsed.error.issues });
      }

      const { userId, id } = request.params;
      const data = parsed.data;

      const existing = await db
        .select({ id: stayContext.id })
        .from(stayContext)
        .where(and(eq(stayContext.id, id), eq(stayContext.userId, userId)))
        .limit(1);

      if (existing.length === 0) {
        return reply.code(404).send({ error: 'Stay not found' });
      }

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (data.stayType) updateData.stayType = data.stayType;
      if (data.stayLocation) updateData.stayLocation = data.stayLocation;
      if (data.startDate) updateData.startDate = new Date(data.startDate);
      if (data.endDate) updateData.endDate = new Date(data.endDate);
      if (data.followUpMonths !== undefined) updateData.followUpMonths = data.followUpMonths;
      if (data.status) updateData.status = data.status;
      if (data.metadata !== undefined) updateData.metadata = data.metadata;
      if (data.hubStayBookingId !== undefined) updateData.hubStayBookingId = data.hubStayBookingId;

      const rows = await db
        .update(stayContext)
        .set(updateData)
        .where(eq(stayContext.id, id))
        .returning();

      return rows[0];
    },
  );
}
