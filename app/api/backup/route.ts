import { getChatGPTUser } from "../../chatgpt-auth";
import { isUnlocked } from "../../app-lock";
import { backupSchema, MAX_BACKUP_BYTES, restoredTaskId, restoredNoteId } from "../../backup";
import { stepProgress } from "../../task-logic";
import { getDb } from "../../../db";
import { tasks, notes } from "../../../db/schema";
export const dynamic="force-dynamic";
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"no-store"}});
export async function POST(request:Request) {
  const user=await getChatGPTUser();
  if(!user)return json({error:"Inicia sesión para restaurar el respaldo."},401);
  if(!(await isUnlocked(user.userId)))return json({error:"Desbloquea la app antes de importar."},423);
  if(request.headers.get("origin")!==new URL(request.url).origin)return json({error:"Solicitud no permitida."},403);
  if(!request.headers.get("content-type")?.startsWith("application/json"))return json({error:"Selecciona un respaldo JSON."},415);
  try {
    const reader=request.body?.getReader(); if(!reader)return json({error:"El respaldo está vacío."},400);
    const chunks:Uint8Array[]=[];let size=0;
    while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>MAX_BACKUP_BYTES){await reader.cancel();return json({error:"El archivo supera 5 MB."},413);}chunks.push(part.value);}
    const all=new Uint8Array(size);let offset=0;for(const chunk of chunks){all.set(chunk,offset);offset+=chunk.length;}
    let raw:unknown;try{raw=JSON.parse(new TextDecoder().decode(all));}catch{return json({error:"El archivo no contiene JSON válido."},400);}
    const parsed=backupSchema.safeParse(raw);
    if(!parsed.success)return json({error:"Respaldo incompatible o dañado. Usa un respaldo de Nexus Notes de hasta 200 tareas y 200 apuntes."},400);
    if(!parsed.data.tasks.length && !parsed.data.notes.length)return json({created:0,skipped:0});
    const db=getDb();const now=new Date().toISOString();
    const ids=await Promise.all(parsed.data.tasks.map((task,index)=>restoredTaskId(user.userId,task,index)));
    const noteIds=await Promise.all(parsed.data.notes.map((note,index)=>restoredNoteId(user.userId,note,index)));
    const taskQueries=parsed.data.tasks.map((task,index)=>db.insert(tasks).values({
      ...task,id:ids[index],owner:user.userId,sharedWith:[],
      progress:stepProgress(task.steps,task.progress),updatedAt:now,
    }).onConflictDoNothing().returning({id:tasks.id}));
    const noteQueries=parsed.data.notes.map((note,index)=>db.insert(notes).values({...note,id:noteIds[index],owner:user.userId,sharedWith:[],updatedAt:now}).onConflictDoNothing().returning({id:notes.id}));
    const queries=[...taskQueries,...noteQueries];
    const results=await db.batch(queries as [typeof queries[number],...typeof queries]);
    const created=results.reduce((count,rows)=>count+rows.length,0);
    return json({created,skipped:parsed.data.tasks.length+parsed.data.notes.length-created});
  }catch{return json({error:"No se pudo restaurar el respaldo. Puedes reintentar; las mismas copias no se duplicarán."},500);}
}
