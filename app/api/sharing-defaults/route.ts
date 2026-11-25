import {getChatGPTUser} from "../../chatgpt-auth";
import {isUnlocked} from "../../app-lock";
import {defaultRecipients} from "../../sharing-defaults";
import {getDb} from "../../../db";
import {sharingDefaults} from "../../../db/schema";
import {z} from "zod";
export const dynamic="force-dynamic";
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"no-store"}});
const schema=z.object({emails:z.array(z.string().trim().toLowerCase().email().max(254)).max(10)}).strict();
export async function GET(){
  const user=await getChatGPTUser();if(!user)return json({error:"Inicia sesión."},401);
  if(!await isUnlocked(user.userId))return json({error:"Desbloquea la app."},423);
  try{return json({emails:await defaultRecipients(user.userId)});}catch{return json({error:"No se pudo cargar la configuración."},500);}
}
export async function POST(request:Request){
  const user=await getChatGPTUser();if(!user)return json({error:"Inicia sesión."},401);
  if(!await isUnlocked(user.userId))return json({error:"Desbloquea la app."},423);
  if(request.headers.get("origin")!==new URL(request.url).origin)return json({error:"Solicitud no permitida."},403);
  if(!request.headers.get("content-type")?.startsWith("application/json"))return json({error:"Formato inválido."},415);
  try{
    const raw=await request.text();if(raw.length>5000)return json({error:"Demasiados datos."},413);
    let value:unknown;try{value=JSON.parse(raw);}catch{return json({error:"Formato inválido."},400);}
    const parsed=schema.safeParse(value);if(!parsed.success)return json({error:"Usa hasta 10 correos válidos."},400);
    const emails=[...new Set(parsed.data.emails)].filter(email=>email!==user.email.toLowerCase());
    await getDb().insert(sharingDefaults).values({owner:user.userId,emails}).onConflictDoUpdate({target:sharingDefaults.owner,set:{emails}});
    return json({emails});
  }catch{return json({error:"No se guardó la configuración. Reintenta."},500);}
}
