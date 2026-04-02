import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest } from 'fastify';

export interface AuthUser {
  id: string;
  email: string;
  role?: string;
  collection?: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser | null;
  }
}

const PATHS_API_URL = process.env.PATHS_API_URL || 'https://app.limitless-longevity.health/learn';

async function authPlugin(fastify: FastifyInstance) {
  fastify.decorateRequest('user', null);

  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    const token = request.cookies['payload-token'];
    if (!token) {
      request.user = null;
      return;
    }

    try {
      const res = await fetch(`${PATHS_API_URL}/api/users/me`, {
        headers: {
          Authorization: `JWT ${token}`,
        },
      });

      if (!res.ok) {
        request.user = null;
        return;
      }

      const data = await res.json();
      if (!data.user) {
        request.user = null;
        return;
      }

      // Convert id to string for consistent comparison with route params
      request.user = {
        id: String(data.user.id),
        email: data.user.email,
        role: data.user.role,
        collection: data.user.collection || 'users',
      };
    } catch {
      request.user = null;
    }
  });
}

export default fp(authPlugin, {
  name: 'auth',
  dependencies: ['@fastify/cookie'],
});
