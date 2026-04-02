import type { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { wearableDevices } from '../db/schema.js';
import { getAuthUrl, consumeState, exchangeCode } from '../services/oura.js';
import { syncDevice } from '../services/wearable-sync.js';
import { connectDeviceSchema } from '../schemas/wearable.js';

const OAUTH_REDIRECT_URI = process.env.OURA_REDIRECT_URI || 'https://app.limitless-longevity.health/api/twin/oauth/callback';

function assertAccess(request: { user: { id: string } | null; service: { name: string; scopes: string[] } | null }, userId: string) {
  if (request.service) return null;
  if (!request.user) return 401 as const;
  if (String(request.user.id) !== String(userId)) return 403 as const;
  return null;
}

export default async function wearableRoutes(fastify: FastifyInstance) {
  // POST /api/twin/:userId/wearable-devices/connect
  fastify.post<{ Params: { userId: string }; Body: unknown }>(
    '/api/twin/:userId/wearable-devices/connect',
    async (request, reply) => {
      const denied = assertAccess(request, request.params.userId);
      if (denied === 401) return reply.code(401).send({ error: 'Unauthorized' });
      if (denied === 403) return reply.code(403).send({ error: 'Forbidden' });

      const parsed = connectDeviceSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Validation failed', details: parsed.error.issues });
      }

      const { provider } = parsed.data;
      const { userId } = request.params;

      if (provider === 'oura') {
        const authUrl = getAuthUrl(userId, OAUTH_REDIRECT_URI);
        return { authUrl };
      }

      return reply.code(400).send({ error: `Unsupported provider: ${provider}` });
    },
  );

  // GET /api/twin/oauth/callback — OAuth redirect handler
  fastify.get<{ Querystring: { code?: string; state?: string; error?: string } }>(
    '/api/twin/oauth/callback',
    async (request, reply) => {
      const { code, state, error } = request.query;

      if (error) {
        return reply.redirect('/?wearable_error=denied');
      }

      if (!code || !state) {
        return reply.code(400).send({ error: 'Missing code or state' });
      }

      const userId = consumeState(state);
      if (!userId) {
        return reply.code(400).send({ error: 'Invalid or expired state token' });
      }

      try {
        const tokens = await exchangeCode(code, OAUTH_REDIRECT_URI);

        // Upsert device record
        const existing = await db
          .select({ id: wearableDevices.id })
          .from(wearableDevices)
          .where(and(eq(wearableDevices.userId, userId), eq(wearableDevices.provider, 'oura')))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(wearableDevices)
            .set({
              accessToken: tokens.access_token,
              refreshToken: tokens.refresh_token,
              tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
              isActive: true,
              updatedAt: new Date(),
            })
            .where(eq(wearableDevices.id, existing[0].id));
        } else {
          await db
            .insert(wearableDevices)
            .values({
              userId,
              provider: 'oura',
              deviceId: `oura-${userId}`,
              accessToken: tokens.access_token,
              refreshToken: tokens.refresh_token,
              tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
              isActive: true,
            });
        }

        return reply.redirect('/health?wearable_connected=oura');
      } catch (err) {
        fastify.log.error(err, 'Oura OAuth callback failed');
        return reply.redirect('/?wearable_error=exchange_failed');
      }
    },
  );

  // GET /api/twin/:userId/wearable-devices
  fastify.get<{ Params: { userId: string } }>(
    '/api/twin/:userId/wearable-devices',
    async (request, reply) => {
      const denied = assertAccess(request, request.params.userId);
      if (denied === 401) return reply.code(401).send({ error: 'Unauthorized' });
      if (denied === 403) return reply.code(403).send({ error: 'Forbidden' });

      const rows = await db
        .select({
          id: wearableDevices.id,
          provider: wearableDevices.provider,
          isActive: wearableDevices.isActive,
          lastSyncAt: wearableDevices.lastSyncAt,
          createdAt: wearableDevices.createdAt,
        })
        .from(wearableDevices)
        .where(eq(wearableDevices.userId, request.params.userId));

      return { devices: rows };
    },
  );

  // DELETE /api/twin/:userId/wearable-devices/:deviceId
  fastify.delete<{ Params: { userId: string; deviceId: string } }>(
    '/api/twin/:userId/wearable-devices/:deviceId',
    async (request, reply) => {
      const denied = assertAccess(request, request.params.userId);
      if (denied === 401) return reply.code(401).send({ error: 'Unauthorized' });
      if (denied === 403) return reply.code(403).send({ error: 'Forbidden' });

      const { userId, deviceId } = request.params;

      await db
        .update(wearableDevices)
        .set({
          isActive: false,
          accessToken: null,
          refreshToken: null,
          tokenExpiresAt: null,
          updatedAt: new Date(),
        })
        .where(and(eq(wearableDevices.id, deviceId), eq(wearableDevices.userId, userId)));

      return { success: true };
    },
  );

  // POST /api/twin/:userId/wearable-devices/:deviceId/sync — manual sync
  fastify.post<{ Params: { userId: string; deviceId: string } }>(
    '/api/twin/:userId/wearable-devices/:deviceId/sync',
    async (request, reply) => {
      const denied = assertAccess(request, request.params.userId);
      if (denied === 401) return reply.code(401).send({ error: 'Unauthorized' });
      if (denied === 403) return reply.code(403).send({ error: 'Forbidden' });

      try {
        await syncDevice(request.params.deviceId);
        return { success: true };
      } catch (err) {
        return reply.code(500).send({ error: 'Sync failed', message: (err as Error).message });
      }
    },
  );
}
