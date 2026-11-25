import { cookies } from "next/headers";
import { and, eq, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { getChatGPTUser } from "../../chatgpt-auth";
import { LOCK_COOKIE, isUnlocked } from "../../app-lock";
import { digest, equalHash, passwordHash, randomToken } from "../../lock-crypto";
import { getDb } from "../../../db";
import { appLocks, unlockSessions } from "../../../db/schema";
export const dynamic = "force-dynamic";
const input = z.object({
  action: z.enum(["setup", "unlock", "lock", "change"]),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,60}$/).optional(),
  password: z.string().min(1).max(128).optional(),
  confirm: z.string().max(128).optional(),
  newPassword: z.string().min(12).max(128).optional(),
});
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return json({error:"Primero inicia sesión con ChatGPT."},401);
  if (request.headers.get("origin") !== new URL(request.url).origin) return json({error:"Solicitud no permitida."},403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return json({error:"Formato no permitido."},415);
  const body = await request.text();
  if(body.length > 4096) return json({error:"Solicitud demasiado grande."},413);
  let raw: unknown;
  try { raw = JSON.parse(body); } catch { return json({error:"Solicitud inválida."},400); }
  const parsed = input.safeParse(raw);
  if(!parsed.success) return json({error:"Usa un usuario de 3 a 60 letras, números, puntos, guiones o guiones bajos."},400);
  const {action,username,password,confirm,newPassword} = parsed.data;
  const db = getDb();
  const jar = await cookies();
  const secure = new URL(request.url).protocol === "https:";
  try {
    if(action === "lock") {
      const token=jar.get(LOCK_COOKIE)?.value;
      if(token) await db.delete(unlockSessions).where(and(eq(unlockSessions.owner,user.userId),eq(unlockSessions.tokenHash,await digest(token))));
      jar.set(LOCK_COOKIE,"",{path:"/",httpOnly:true,secure,sameSite:"strict",maxAge:0});
      return json({ok:true});
    }
    if(action === "change" && !(await isUnlocked(user.userId))) return json({error:"Desbloquea la app primero.",locked:true},423);
    if((action !== "change" && !username) || !password) return json({error:"Ingresa tu usuario y contraseña."},400);
    if(action === "change" && (!newPassword || newPassword.trim().length < 12 || newPassword !== confirm)) return json({error:"La nueva contraseña debe tener al menos 12 caracteres y coincidir con su confirmación."},400);
    const rows = await db.select().from(appLocks).where(eq(appLocks.owner,user.userId));
    if(action === "setup") {
      if(rows.length) return json({error:"Tu acceso ya está configurado. Recarga e inicia sesión."},409);
      if(password.length < 12 || password.trim().length < 12) return json({error:"Elige una contraseña de al menos 12 caracteres."},400);
      if(password !== confirm) return json({error:"Las contraseñas no coinciden."},400);
      const salt=randomToken(16);
      const inserted=await db.insert(appLocks).values({owner:user.userId,username:username!,salt,passwordHash:await passwordHash(password,salt)}).onConflictDoNothing().returning({owner:appLocks.owner});
      if(!inserted.length) return json({error:"Tu acceso ya está configurado. Recarga la página."},409);
    } else {
      if(!rows.length) return json({error:"Configura primero tu acceso. Recarga la página."},409);
      const now=Date.now();
      const cutoff=now-15*60*1000;
      // Reserve each attempt atomically so concurrent requests share the same limit.
      const attempts=await db.update(appLocks).set({
        attempts:sql`CASE WHEN ${appLocks.windowStart} <= ${cutoff} THEN 1 ELSE ${appLocks.attempts} + 1 END`,
        windowStart:sql`CASE WHEN ${appLocks.windowStart} <= ${cutoff} THEN ${now} ELSE ${appLocks.windowStart} END`,
      }).where(and(eq(appLocks.owner,user.userId),sql`(${appLocks.windowStart} <= ${cutoff} OR ${appLocks.attempts} < 5)`)).returning({owner:appLocks.owner});
      if(!attempts.length) return json({error:"Demasiados intentos. Espera 15 minutos desde el primer intento y vuelve a probar."},429);
      const matches=equalHash(await passwordHash(password,rows[0].salt),rows[0].passwordHash);
      if(!matches || (action !== "change" && username !== rows[0].username)) return json({error:"Usuario o contraseña incorrectos."},401);
      if(action === "change") {
        const salt=randomToken(16);
        const result = await db.batch([
          db.update(appLocks).set({salt,passwordHash:await passwordHash(newPassword!,salt),attempts:0,windowStart:0}).where(and(eq(appLocks.owner,user.userId),eq(appLocks.passwordHash,rows[0].passwordHash))).returning({owner:appLocks.owner}),
          db.delete(unlockSessions).where(eq(unlockSessions.owner,user.userId)),
        ]);
        jar.set(LOCK_COOKIE,"",{path:"/",httpOnly:true,secure,sameSite:"strict",maxAge:0});
        if(!result[0].length) return json({error:"El acceso cambió en otra sesión. Vuelve a iniciar sesión."},409);
        return json({ok:true,locked:true});
      }
      await db.update(appLocks).set({attempts:0,windowStart:0}).where(eq(appLocks.owner,user.userId));
    }
    const token=randomToken();
    const oldToken=jar.get(LOCK_COOKIE)?.value;
    if(oldToken) await db.delete(unlockSessions).where(and(eq(unlockSessions.owner,user.userId),eq(unlockSessions.tokenHash,await digest(oldToken))));
    await db.delete(unlockSessions).where(and(eq(unlockSessions.owner,user.userId),lt(unlockSessions.expiresAt,Date.now())));
    await db.insert(unlockSessions).values({owner:user.userId,tokenHash:await digest(token),expiresAt:Date.now()+12*60*60*1000});
    jar.set(LOCK_COOKIE,token,{httpOnly:true,secure,sameSite:"strict",path:"/",maxAge:12*60*60});
    return json({ok:true});
  } catch { return json({error:"No se pudo completar el acceso. Intenta nuevamente."},500); }
}
