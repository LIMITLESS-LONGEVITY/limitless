import { z } from 'zod';
import { createBiomarkerSchema } from './biomarker.js';

export const createDiagnosticSchema = z.object({
  packageType: z.string().min(1),
  performedAt: z.string().datetime(),
  hubBookingId: z.string().optional(),
  clinicianId: z.string().optional(),
  facility: z.string().optional(),
  summary: z.string().optional(),
  recommendations: z.array(z.string()).optional(),
  biomarkers: z.array(createBiomarkerSchema).optional(),
});

export type CreateDiagnosticInput = z.infer<typeof createDiagnosticSchema>;
