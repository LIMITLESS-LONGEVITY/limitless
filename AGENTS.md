# Agent Instructions — Digital Twin Service

## Route Patterns

All routes live in `src/routes/`. Each file exports a default async function that receives a `FastifyInstance` and registers routes on it.

```typescript
import type { FastifyInstance } from 'fastify';

export default async function myRoutes(fastify: FastifyInstance) {
  fastify.get('/api/twin/:userId/something', async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    // ...
  });
}
```

New route files must be imported and registered in `src/index.ts`.

## Auth

The auth plugin (`src/plugins/auth.ts`) runs on every request. It reads the `payload-token` cookie and verifies it with the shared `JWT_SECRET`. The decoded user is available at `request.user`.

- `request.user` is `null` if no valid token is present
- Always check `if (!request.user)` before accessing protected data
- The JWT payload matches the PATHS user structure: `{ id, email, role, collection }`

## Drizzle Patterns

- Schema is in `src/db/schema.ts` — all tables defined here
- Client singleton is in `src/db/client.ts` — import `db` from there
- Use `eq`, `and`, `desc`, etc. from `drizzle-orm` for query building
- Always use `.js` extensions in imports (ESM)

Example query:
```typescript
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { healthProfiles } from '../db/schema.js';

const profile = await db
  .select()
  .from(healthProfiles)
  .where(eq(healthProfiles.userId, userId))
  .limit(1);
```

## Validation

Use Zod schemas for request body validation. Define schemas alongside the route that uses them or in a shared `src/schemas/` directory if reused across routes.

## Testing

Tests use Vitest. Place test files next to the source or in a `tests/` directory. No database required for unit tests — mock `db` calls.
