import { z } from "zod";
export const noteFields = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(160),
  content: z.string().max(10000),
});
export const noteInput = noteFields.extend({
  sharedWith: z.array(z.string().trim().toLowerCase().email().max(254)).max(20).optional(),
});
export type Note = z.infer<typeof noteInput> & { updatedAt?: string; isOwner?: boolean; shared?: boolean };
