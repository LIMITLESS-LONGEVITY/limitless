import { z } from 'zod';

export const connectDeviceSchema = z.object({
  provider: z.enum(['oura']),
});

export const callbackQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

export const summariesQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  provider: z.string().optional(),
});

export const wearableDataQuerySchema = z.object({
  metric: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
