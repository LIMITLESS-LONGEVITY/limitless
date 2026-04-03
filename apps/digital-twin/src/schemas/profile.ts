import { z } from 'zod';

export const updateProfileSchema = z.object({
  dateOfBirth: z.string().optional(),
  biologicalSex: z.string().optional(),
  height: z.number().positive().optional(),
  weight: z.number().positive().optional(),
  conditions: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  familyHistory: z.array(z.record(z.unknown())).optional(),
  pillarPriorities: z.record(z.number()).optional(),
  healthGoals: z.array(z.string()).optional(),
  biologicalAge: z.number().positive().optional(),
  chronologicalAge: z.number().positive().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
