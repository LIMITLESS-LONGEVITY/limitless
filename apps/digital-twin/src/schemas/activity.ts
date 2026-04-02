import { z } from 'zod';

export const createActivitySchema = z.object({
  source: z.string().min(1),
  eventType: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
  occurredAt: z.string().datetime().optional(),
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
