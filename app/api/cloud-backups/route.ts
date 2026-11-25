import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { isUnlocked } from "../../app-lock";
import { backupPrefix,createCloudBackup } from "../../cloud-backup-service";
export const dynamic="force-dynamic";
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{"Cache-Control":"no-store"}});
export async function GET(request:Request){
 const user=await getChatGPTUser();if(!user)return json({error:"Inicia sesión."},401);if(!(await isUnlocked(user.userId)))return json({error:"Desbloquea la app."},423);
 if(!env.BUCKET)return json({error:"El almacenamiento de respaldos aún no está disponible."},503);
 try{
  const prefix=await backupPrefix(user.userId),day=new URL(request.url).searchParams.get("day");
  if(day){if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return json({error:"Fecha inválida."},400);const object=await env.BUCKET.get(`${prefix}${day}.json`);if(!object)return json({error:"Respaldo no encontrado."},404);return new Response(object.body,{headers:{"Content-Type":"application/json","Cache-Control":"no-store","Content-Disposition":`attachment; filename="nexus-respaldo-${day}.json"`}});}
  const result=await env.BUCKET.list({prefix,limit:1000});
  return json({snapshots:result.objects.filter(o=>/^\d{4}-\d{2}-\d{2}\.json$/.test(o.key.slice(prefix.length))).map(o=>({day:o.key.slice(prefix.length,-5),bytes:o.size})).sort((a,b)=>b.day.localeCompare(a.day))});
 }catch{return json({error:"No se pudieron consultar los respaldos."},500);}
}
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user)return json({error:"Inicia sesión."},401);if(!(await isUnlocked(user.userId)))return json({error:"Desbloquea la app."},423);
 if(request.headers.get("origin")!==new URL(request.url).origin)return json({error:"Solicitud no permitida."},403);
 try{return json(await createCloudBackup(user.userId));}catch{return json({error:"No se pudo crear el respaldo. Límite: 200 tareas, 200 apuntes y 5 MB. Puedes descargar también el respaldo manual."},500);}
}
