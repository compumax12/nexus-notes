import { getChatGPTUser } from "../../chatgpt-auth";
import { isUnlocked } from "../../app-lock";
import { noteInput } from "../../note-schema";
import {defaultRecipients} from "../../sharing-defaults";
import { getDb } from "../../../db";
import { notes } from "../../../db/schema";
import { and, eq, desc, or, sql } from "drizzle-orm";
export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const accessible = (id: string, email: string) => or(eq(notes.owner,id), sql`EXISTS (SELECT 1 FROM json_each(${notes.sharedWith}) WHERE value = ${email.toLowerCase()})`);
function present(row: typeof notes.$inferSelect, owner: string) {
  const {owner: noteOwner, ...data} = row;
  return {...data, isOwner: noteOwner === owner, sharedWith: noteOwner === owner ? row.sharedWith : [], shared: noteOwner !== owner || row.sharedWith.length > 0};
}
export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return json({ error: "Inicia sesión para ver tus apuntes." },401);
  if (!(await isUnlocked(user.userId))) return json({error:"Desbloquea la app.",locked:true},423);
  try { return json((await getDb().select().from(notes).where(accessible(user.userId,user.email)).orderBy(desc(notes.updatedAt))).map(row=>present(row,user.userId))); }
  catch { return json({error:"No se pudieron cargar tus apuntes. Reintenta."},500); }
}
export async function POST(request:Request) {
  const user = await getChatGPTUser();
  if (!user) return json({error:"Tu sesión expiró."},401);
  if (!(await isUnlocked(user.userId))) return json({error:"Desbloquea la app.",locked:true},423);
  if(request.headers.get("origin")!==new URL(request.url).origin) return json({error:"Solicitud no permitida."},403);
  if(!request.headers.get("content-type")?.startsWith("application/json"))return json({error:"Formato no permitido."},415);
  const raw = await request.text();
  if(raw.length>100000)return json({error:"El apunte es demasiado grande."},413);
  let value:unknown;try{value=JSON.parse(raw);}catch{return json({error:"Formato inválido."},400);}
  const parsed=noteInput.safeParse(value);
  if(!parsed.success)return json({error:"Revisa el título (hasta 160 caracteres), el contenido (hasta 10 000) y los correos."},400);
  try {
    const db=getDb();const {id,title,content,sharedWith}=parsed.data;
    const existing=id?(await db.select().from(notes).where(and(eq(notes.id,id),accessible(user.userId,user.email))))[0]:undefined;
    if(id&&!existing)return json({error:"Este apunte ya no está disponible o no tienes acceso."},404);
    const owner=!existing||existing.owner===user.userId;
    if(!owner&&sharedWith?.length)return json({error:"Solo su creador puede compartir el apunte."},403);
    const defaults=existing?[]:await defaultRecipients(user.userId);
    const recipients=[...new Set([...(sharedWith??existing?.sharedWith??[]),...defaults])].filter(address=>address!==user.email.toLowerCase());
    if(owner&&recipients.length>20)return json({error:"Máximo 20 personas, incluidos los destinatarios automáticos."},400);
    const row={title,content,updatedAt:new Date().toISOString(),...(owner?{sharedWith:recipients}:{})};
    if(id){
      // Recheck access at write time; collaborators never overwrite permissions.
      const rows=await db.update(notes).set(row).where(and(eq(notes.id,id),accessible(user.userId,user.email))).returning();
      return rows.length?json(present(rows[0],user.userId)):json({error:"Ya no tienes acceso al apunte."},404);
    }
    const rows=await db.insert(notes).values({...row,id:crypto.randomUUID(),owner:user.userId}).returning();
    return json(present(rows[0],user.userId),201);
  } catch{return json({error:"No se guardaron los cambios. Conserva el formulario y reintenta."},500);}
}
