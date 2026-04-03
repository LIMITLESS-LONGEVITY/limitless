import type { FastifyInstance } from 'fastify';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json') as { version: string };

export default async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/api/health', async (_request, _reply) => {
    return {
      status: 'ok',
      service: 'digital-twin',
      version: pkg.version,
      uptime: Math.floor(process.uptime()),
    };
  });
}
