import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { tasks } from "../../../db/schema";
import { and, eq, desc, or, sql } from "drizzle-orm";
import { z } from "zod";
import { env } from "cloudflare:workers";
import { stepProgress, nextOccurrence, validDay, type Recurrence } from "../../task-logic";
import { isUnlocked } from "../../app-lock";
import { defaultRecipients } from "../../sharing-defaults";
export const dynamic = "force-dynamic";
const input = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(160),
  notes: z.string().max(5000),
  requester: z.string().max(120),
  priority: z.enum(["Alta", "Media", "Baja"]),
  due: z.string().refine(value=>!value||validDay(value)),
  recurrence: z.enum(["none","daily","weekly","monthly"]).optional(),
  progress: z.number().int().min(0).max(100),
  sharedWith: z.array(z.string().trim().toLowerCase().email().max(254)).max(20).optional(),
  steps: z.array(z.object({ id: z.string().uuid(), title: z.string().trim().min(1).max(200), done: z.boolean() })).max(50).refine(steps => new Set(steps.map(s => s.id)).size === steps.length).optional(),
});
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const accessible = (id: string, email: string) => or(eq(tasks.owner,id), sql`EXISTS (SELECT 1 FROM json_each(${tasks.sharedWith}) WHERE value = ${email.toLowerCase()})`);
function present(row: typeof tasks.$inferSelect, owner: string) {
  const {owner: taskOwner, ...data} = row;
  return {...data, isOwner: taskOwner === owner, sharedWith: taskOwner === owner ? row.sharedWith : [], shared: taskOwner !== owner || row.sharedWith.length > 0};
}
export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return json({ error: "Inicia sesión para ver tus tareas." }, 401);
  if (!(await isUnlocked(user.userId))) return json({ error: "Desbloquea la app con tu contraseña.", locked: true }, 423);
  try {
    const rows = await getDb().select().from(tasks).where(accessible(user.userId,user.email)).orderBy(desc(tasks.updatedAt));
    return json(rows.map(row => present(row,user.userId)));
  } catch { return json({ error: "No se pudieron cargar tus tareas. Intenta nuevamente." }, 500); }
}
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return json({ error: "Tu sesión expiró. Vuelve a iniciar sesión." }, 401);
  if (!(await isUnlocked(user.userId))) return json({ error: "Desbloquea la app con tu contraseña.", locked: true }, 423);
  const origin = request.headers.get("origin");
  if (origin !== new URL(request.url).origin) return json({ error: "Solicitud no permitida." }, 403);
  if(!request.headers.get("content-type")?.startsWith("application/json"))return json({error:"Formato no permitido."},415);
  const raw=await request.text();if(raw.length>100000)return json({error:"Solicitud demasiado grande."},413);
  let value:unknown;try{value=JSON.parse(raw);}catch{return json({error:"Solicitud inválida."},400);}
  const parsed = input.safeParse(value);
  if (!parsed.success) return json({ error: "Revisa el título, fecha y porcentaje de avance." }, 400);
  try {
    const { id, ...data } = parsed.data;
    const existing = id ? (await getDb().select().from(tasks).where(and(eq(tasks.id,id),accessible(user.userId,user.email))))[0] : undefined;
    if(id && !existing) return json({error:"Esta tarea ya no está disponible o ya no tienes acceso."},404);
    const isOwner = !existing || existing.owner === user.userId;
    if(!isOwner && data.sharedWith?.length) return json({error:"Solo quien creó la tarea puede compartirla."},403);
    const recurrence=data.recurrence??existing?.recurrence??"none";
    if(!isOwner&&data.recurrence!==undefined&&data.recurrence!==existing?.recurrence)return json({error:"Solo su creador puede cambiar la repetición."},403);
    if(recurrence!=="none"&&!data.due)return json({error:"Elige una fecha límite para la tarea recurrente."},400);
    const recurrenceDay=recurrence==="none"?0:existing&&existing.due===data.due&&existing.recurrence===recurrence&&existing.recurrenceDay?existing.recurrenceDay:Number(data.due.slice(8));
    const steps = data.steps ?? existing?.steps ?? [];
    const defaults=existing?[]:await defaultRecipients(user.userId);
    const sharedWith = isOwner ? [...new Set([...(data.sharedWith ?? existing?.sharedWith ?? []),...defaults])].filter(email => email !== user.email.toLowerCase()) : undefined;
    if(sharedWith && sharedWith.length>20)return json({error:"Máximo 20 personas, incluidos los destinatarios automáticos."},400);
    const {sharedWith: _shared, recurrence:_recurrence, ...fields} = data;
    // Collaborator writes never overwrite sharing permissions, including concurrent revocations.
    const row = { ...fields, recurrence, recurrenceDay, ...(isOwner ? {sharedWith} : {}), steps, progress: stepProgress(steps, data.progress), updatedAt: new Date().toISOString() };
    if (id && existing) {
      const shouldRepeat=existing.progress<100&&row.progress===100&&recurrence!=="none";
      if(shouldRepeat){
        const due=nextOccurrence(row.due,recurrence as Exclude<Recurrence,"none">,recurrenceDay);
        if(!validDay(due))return json({error:"La fecha de la siguiente repetición queda fuera del rango admitido."},400);
        const nextId=crypto.randomUUID();
        // One transaction: update only if still accessible and unchanged, then create
        // at most one child from the persisted owner and sharing permissions.
        if(!env.DB)throw new Error("Base de datos no disponible");
        const result=await env.DB.batch([
          env.DB.prepare(`UPDATE tasks SET title=?,notes=?,requester=?,priority=?,due=?,progress=?,steps=?,updated_at=?,recurrence=?,recurrence_day=?,shared_with=CASE WHEN owner=? THEN ? ELSE shared_with END WHERE id=? AND updated_at=? AND (owner=? OR EXISTS(SELECT 1 FROM json_each(shared_with) WHERE value=?)) RETURNING id`).bind(row.title,row.notes,row.requester,row.priority,row.due,row.progress,JSON.stringify(steps),row.updatedAt,recurrence,recurrenceDay,user.userId,JSON.stringify(sharedWith??[]),id,existing.updatedAt,user.userId,user.email.toLowerCase()),
          env.DB.prepare(`INSERT INTO tasks (id,owner,title,notes,requester,priority,due,progress,steps,updated_at,shared_with,recurrence,recurrence_day,recurrence_parent) SELECT ?,owner,title,'',requester,priority,?,0,?,?,shared_with,recurrence,recurrence_day,id FROM tasks WHERE id=? AND changes()=1 ON CONFLICT(recurrence_parent) DO NOTHING RETURNING id`).bind(nextId,due,JSON.stringify(steps.map(s=>({...s,done:false}))),row.updatedAt,id)
        ]);
        if(!result[0].results.length)return json({error:"La tarea cambió en otra sesión o ya no tienes acceso. Actualiza y reintenta."},409);
        const saved=(await getDb().select().from(tasks).where(eq(tasks.id,id)))[0];
        const child=result[1].results.length?(await getDb().select().from(tasks).where(eq(tasks.id,nextId)))[0]:undefined;
        return json({...present(saved,user.userId),nextTask:child?present(child,user.userId):undefined});
      }
      const result = await getDb().update(tasks).set(row).where(and(eq(tasks.id, id), eq(tasks.updatedAt,existing.updatedAt), accessible(user.userId,user.email))).returning();
      if (!result.length) return json({ error: "La tarea cambió o ya no tienes acceso. Actualiza y reintenta." }, 409);
      return json(present(result[0],user.userId));
    }
    if(recurrence!=="none"&&row.progress===100)return json({error:"Crea la tarea recurrente pendiente o en proceso; al completarla se generará la siguiente."},400);
    const result = await getDb().insert(tasks).values({ ...row, id: crypto.randomUUID(), owner: user.userId }).returning();
    return json(present(result[0],user.userId), 201);
  } catch { return json({ error: "No se guardaron los cambios. Conserva el formulario y reintenta." }, 500); }
}
