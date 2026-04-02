import type { FastifyInstance } from 'fastify';
import osConfig from '../config/os-config.json' with { type: 'json' };

export default async function osConfigRoutes(fastify: FastifyInstance) {
  fastify.get('/api/twin/os/config', async (_request, reply) => {
    reply.header('Cache-Control', 'public, max-age=300');
    return osConfig;
  });
}
