import { z } from 'zod';

const locationSchema = z.object({
    // id: z.string().uuid(),
    name: z.string().min(1, "Name is required"),
    latitude: z.number()
                .min(-90, "Latitude must be between -90 and 90")
                .max(90, "Latitude must be between -90 and 90"),

    longitude: z.number()
                .min(-180, "Longitude must be between -180 and 180")
                .max(180, "Longitude must be between -180 and 180"),
    address: z.string().optional(),
});

export {locationSchema};