import type { FastifyInstance } from 'fastify';

export default async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/api/health', async (_request, _reply) => {
    return { status: 'ok', service: 'digital-twin', version: '1.1.0' };
  });
}
