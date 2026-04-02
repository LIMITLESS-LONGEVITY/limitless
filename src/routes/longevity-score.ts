import type { FastifyInstance } from 'fastify';
import { calculateLongevityScore, getLongevityScoreHistory } from '../services/longevity-score.js';

function assertAccess(
  request: { user: { id: string } | null; service: { name: string; scopes: string[] } | null },
  userId: string,
) {
  if (request.service) return null;
  if (!request.user) return 401 as const;
  if (String(request.user.id) !== String(userId)) return 403 as const;
  return null;
}

export default async function longevityScoreRoutes(fastify: FastifyInstance) {
  // POST /api/twin/:userId/longevity-score/calculate
  fastify.post<{ Params: { userId: string } }>(
    '/api/twin/:userId/longevity-score/calculate',
    async (request, reply) => {
      const denied = assertAccess(request, request.params.userId);
      if (denied === 401) return reply.code(401).send({ error: 'Unauthorized' });
      if (denied === 403) return reply.code(403).send({ error: 'Forbidden' });

      const { userId } = request.params;

      try {
        const result = await calculateLongevityScore(userId);
        return result;
      } catch (err) {
        request.log.error(err, 'Failed to calculate longevity score');
        return reply.code(500).send({ error: 'Score calculation failed' });
      }
    },
  );

  // GET /api/twin/:userId/longevity-score/history?days=30
  fastify.get<{
    Params: { userId: string };
    Querystring: { days?: string };
  }>(
    '/api/twin/:userId/longevity-score/history',
    async (request, reply) => {
      const denied = assertAccess(request, request.params.userId);
      if (denied === 401) return reply.code(401).send({ error: 'Unauthorized' });
      if (denied === 403) return reply.code(403).send({ error: 'Forbidden' });

      const { userId } = request.params;
      const days = Math.min(Math.max(parseInt(request.query.days || '30', 10), 1), 365);

      const history = await getLongevityScoreHistory(userId, days);
      return { data: history, days };
    },
  );
}
