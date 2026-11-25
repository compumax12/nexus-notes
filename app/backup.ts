import { z } from "zod";
import { noteFields } from "./note-schema";
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
const task = z.object({
  recurrence:z.enum(["none","daily","weekly","monthly"]).optional(),
  recurrenceDay:z.number().int().min(0).max(31).optional(),
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(160), notes: z.string().max(5000),
  requester: z.string().max(120), priority: z.enum(["Alta", "Media", "Baja"]),
  due: z.string().refine(value => !value || (/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value)),
  progress: z.number().int().min(0).max(100),
  steps: z.array(z.object({id:z.string().uuid(),title:z.string().trim().min(1).max(200),done:z.boolean()})).max(50).refine(steps=>new Set(steps.map(s=>s.id)).size===steps.length).default([]),
}).refine(task=>!task.recurrence||task.recurrence==="none"||!!task.due);
// Strip ownership, sharing and any other fields supplied by the file.
export const backupSchema = z.object({
  format:z.literal("mi-avance-backup"),version:z.union([z.literal(1),z.literal(2)]),exportedAt:z.string().datetime(),
  taskCount:z.number().int().min(0).max(200),tasks:z.array(task).max(200),
  noteCount:z.number().int().min(0).max(200).optional(),notes:z.array(noteFields).max(200).default([]),
}).refine(value=>value.taskCount===value.tasks.length && (value.version===1 ? value.notes.length===0 : value.noteCount===value.notes.length));
export type Backup = z.infer<typeof backupSchema>;
export async function restoredTaskId(owner:string,task:Backup["tasks"][number],index:number) {
  const {recurrence,recurrenceDay,...legacy}=task;
  const canonical=recurrence&&recurrence!=="none"?{...legacy,recurrence,recurrenceDay:recurrenceDay||Number(task.due.slice(8))}:legacy;
  const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(["nexus-private-restore-v1",owner,task.id ?? index,canonical])));
  const hex=Array.from(new Uint8Array(bytes)).map(b=>b.toString(16).padStart(2,"0")).join("");
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
}

export async function restoredNoteId(owner:string,note:Backup["notes"][number],index:number) {
  const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(["nexus-note-restore-v1",owner,note.id??index,note])));
  const hex=Array.from(new Uint8Array(bytes)).map(b=>b.toString(16).padStart(2,"0")).join("");
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
}
