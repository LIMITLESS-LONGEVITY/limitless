import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest } from 'fastify';

export interface ServiceIdentity {
  name: string;
  scopes: string[];
}

declare module 'fastify' {
  interface FastifyRequest {
    service: ServiceIdentity | null;
  }
}

async function serviceAuthPlugin(fastify: FastifyInstance) {
  const SERVICE_KEYS: Record<string, ServiceIdentity> = {};

  if (process.env.HUB_SERVICE_KEY) {
    SERVICE_KEYS[process.env.HUB_SERVICE_KEY] = {
      name: 'hub',
      scopes: ['read:*', 'write:diagnostics', 'write:activity'],
    };
  }

  if (process.env.PATHS_SERVICE_KEY) {
    SERVICE_KEYS[process.env.PATHS_SERVICE_KEY] = {
      name: 'paths',
      scopes: ['read:ai-context', 'write:activity'],
    };
  }

  fastify.decorateRequest('service', null);

  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    const serviceKey = request.headers['x-service-key'];

    if (typeof serviceKey === 'string' && SERVICE_KEYS[serviceKey]) {
      request.service = SERVICE_KEYS[serviceKey];
    } else {
      request.service = null;
    }
  });
}

export default fp(serviceAuthPlugin, {
  name: 'service-auth',
});
