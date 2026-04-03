import { z } from 'zod';

export const createBiomarkerSchema = z.object({
  category: z.string().min(1),
  name: z.string().min(1),
  value: z.number(),
  unit: z.string().min(1),
  referenceMin: z.number().optional(),
  referenceMax: z.number().optional(),
  optimalMin: z.number().optional(),
  optimalMax: z.number().optional(),
  status: z.string().optional(),
  source: z.string().optional(),
  sourceId: z.string().optional(),
  enteredBy: z.string().optional(),
  measuredAt: z.string().datetime(),
});

export const batchCreateBiomarkersSchema = z.object({
  biomarkers: z.array(createBiomarkerSchema).min(1).max(500),
});

export type CreateBiomarkerInput = z.infer<typeof createBiomarkerSchema>;
export type BatchCreateBiomarkersInput = z.infer<typeof batchCreateBiomarkersSchema>;
