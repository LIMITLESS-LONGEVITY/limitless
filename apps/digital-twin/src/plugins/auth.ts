import fp from 'fastify-plugin';
import jwt from 'jsonwebtoken';
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

async function authPlugin(fastify: FastifyInstance) {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    fastify.log.warn('JWT_SECRET not set — auth will reject all requests');
  }

  fastify.decorateRequest('user', null);

  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    const token = request.cookies['payload-token'];

    if (!token || !jwtSecret) {
      request.user = null;
      return;
    }

    try {
      const decoded = jwt.verify(token, jwtSecret) as AuthUser;
      request.user = decoded;
    } catch {
      request.user = null;
    }
  });
}

export default fp(authPlugin, {
  name: 'auth',
  dependencies: ['@fastify/cookie'],
});
