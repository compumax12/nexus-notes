import { env } from "cloudflare:workers";
import { cookies } from "next/headers";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getChatGPTUser } from "../../chatgpt-auth";
import { isUnlocked, LOCK_COOKIE } from "../../app-lock";
import { digest, equalHash, passwordHash, randomToken } from "../../lock-crypto";
import { getDb } from "../../../db";
import { appLocks } from "../../../db/schema";
import { recoveryCodeExpired } from "../../../lib/recovery-ttl.mjs";
export const dynamic="force-dynamic";
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store"}});
const input=z.object({action:z.enum(["generate","redeem"]),password:z.string().max(128).optional(),code:z.string().max(100).optional(),newPassword:z.string().min(12).max(128).optional(),confirm:z.string().max(128).optional()});
export async function GET(){const user=await getChatGPTUser();if(!user)return json({error:"Inicia sesión."},401);if(!(await isUnlocked(user.userId)))return json({error:"Desbloquea la app."},423);const row=(await getDb().select().from(appLocks).where(eq(appLocks.owner,user.userId)))[0];return json({configured:!!row?.recoveryHash,createdAt:row?.recoveryCreatedAt??""});}
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user)return json({error:"Inicia sesión con tu cuenta de ChatGPT."},401);
 if(request.headers.get("origin")!==new URL(request.url).origin)return json({error:"Solicitud no permitida."},403);
 if(!request.headers.get("content-type")?.startsWith("application/json"))return json({error:"Formato no permitido."},415);
 const raw=await request.text();if(raw.length>4096)return json({error:"Solicitud demasiado grande."},413);
 let body:unknown;try{body=JSON.parse(raw);}catch{return json({error:"Solicitud inválida."},400);}
 const parsed=input.safeParse(body);if(!parsed.success)return json({error:"Revisa los datos ingresados."},400);
 const {action,password,code,newPassword,confirm}=parsed.data;
 if(action==="generate"&&!(await isUnlocked(user.userId)))return json({error:"Desbloquea la app primero."},423);
 if(action==="redeem"&&(!newPassword||newPassword.trim().length<12||newPassword!==confirm))return json({error:"La contraseña debe tener al menos 12 caracteres y coincidir con su confirmación."},400);
 try{
  const db=getDb();const row=(await db.select().from(appLocks).where(eq(appLocks.owner,user.userId)))[0];if(!row)return json({error:"Primero configura tu acceso."},400);
  const now=Date.now(),cutoff=now-15*60*1000;
  const normalized=action==="redeem"?(code??"").replace(/[\s-]/g,"").toLowerCase():"";
  if(action==="redeem"&&(!/^[a-f0-9]{48}$/.test(normalized)||!row.recoveryHash||recoveryCodeExpired(row.recoveryCreatedAt,now)))return json({error:"Código de emergencia incorrecto o ya utilizado."},401);
  const attempt=await db.update(appLocks).set({attempts:sql`CASE WHEN ${appLocks.windowStart} <= ${cutoff} THEN 1 ELSE ${appLocks.attempts}+1 END`,windowStart:sql`CASE WHEN ${appLocks.windowStart} <= ${cutoff} THEN ${now} ELSE ${appLocks.windowStart} END`}).where(and(eq(appLocks.owner,user.userId),sql`(${appLocks.windowStart} <= ${cutoff} OR ${appLocks.attempts}<5)`)).returning({owner:appLocks.owner});
  if(!attempt.length)return json({error:"Demasiados intentos. Espera 15 minutos desde el primer intento."},429);
  if(action==="generate"){
   if(!password||!equalHash(await passwordHash(password,row.salt),row.passwordHash))return json({error:"Contraseña actual incorrecta."},401);
   const value=randomToken(24),createdAt=new Date().toISOString();
   const result=await db.update(appLocks).set({recoveryHash:await digest(value),recoveryCreatedAt:createdAt,attempts:0,windowStart:0}).where(and(eq(appLocks.owner,user.userId),eq(appLocks.passwordHash,row.passwordHash))).returning({owner:appLocks.owner});
   if(!result.length)return json({error:"Tu acceso cambió. Inicia sesión otra vez."},409);
   return json({code:value.match(/.{8}/g)!.join("-"),createdAt});
  }
  if(!equalHash(await digest(normalized),row.recoveryHash))return json({error:"Código de emergencia incorrecto o ya utilizado."},401);
  const salt=randomToken(16);if(!env.DB)throw new Error("DB unavailable");
  const result=await env.DB.batch([
   env.DB.prepare("UPDATE app_locks SET salt=?,password_hash=?,recovery_hash='',recovery_created_at='',attempts=0,window_start=0 WHERE owner=? AND recovery_hash=? AND password_hash=? RETURNING username").bind(salt,await passwordHash(newPassword!,salt),user.userId,row.recoveryHash,row.passwordHash),
   env.DB.prepare("DELETE FROM unlock_sessions WHERE owner=? AND changes()=1").bind(user.userId)
  ]);
  if(!result[0].results.length)return json({error:"El código ya se utilizó o tu acceso cambió."},409);
  (await cookies()).set(LOCK_COOKIE,"",{path:"/",httpOnly:true,sameSite:"strict",secure:new URL(request.url).protocol==="https:",maxAge:0});
  return json({ok:true,username:row.username});
 }catch{return json({error:"No se pudo completar la operación. Reintenta."},500);}
}
