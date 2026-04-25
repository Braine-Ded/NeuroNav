import { z } from 'zod';

const reportSchema = z.object({
    // id: z.string().uuid(),
    userId: z.string().uuid().optional(),
    locationId: z.string().uuid(),

    note: z.string().optional(),
    validations: z.number().int().min(0).default(0),
    time: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid time format" }).optional(),

    sound: z.enum(['QUIET', 'MODERATE', 'LOUD']),
    crowd: z.enum(['MOSTLY_EMPTY', 'SPACED_OUT', 'CROWDED']),
    lighting: z.enum(['NATURAL', 'BRIGHT', 'DIM', 'FLICKERING']),

});

export { reportSchema };