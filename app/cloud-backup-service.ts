import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { tasks,notes } from "../db/schema";
import { digest } from "./lock-crypto";
import { limaDate } from "./task-logic";
import { backupSchema, MAX_BACKUP_BYTES } from "./backup";
export async function backupPrefix(owner:string){return `snapshots/${await digest(owner)}/`;}
export async function createCloudBackup(owner:string){
 if(!env.BUCKET)throw new Error("Backup storage unavailable");
 const prefix=await backupPrefix(owner),day=limaDate(),key=`${prefix}${day}.json`;
 if(await env.BUCKET.head(key))return {created:false,day};
 const db=getDb();
 const [taskRows,noteRows]=await db.batch([db.select().from(tasks).where(eq(tasks.owner,owner)),db.select().from(notes).where(eq(notes.owner,owner))]);
 const backup={format:"mi-avance-backup",version:2,exportedAt:new Date().toISOString(),taskCount:taskRows.length,tasks:taskRows.map(({owner:_,recurrenceParent:__,...t})=>t),noteCount:noteRows.length,notes:noteRows.map(({owner:_,...n})=>n)};
 if(!backupSchema.safeParse(backup).success)throw new Error("Backup exceeds supported record limit");
 const text=JSON.stringify(backup);if(new TextEncoder().encode(text).byteLength>MAX_BACKUP_BYTES)throw new Error("Backup exceeds supported size");
 await env.BUCKET.put(key,text,{httpMetadata:{contentType:"application/json"},onlyIf:{etagDoesNotMatch:"*"}});
 // Separate object storage preserves snapshots if the working database is damaged.
 const listed=await env.BUCKET.list({prefix,limit:1000});
 const old=listed.objects.filter(o=>/^\d{4}-\d{2}-\d{2}\.json$/.test(o.key.slice(prefix.length))).sort((a,b)=>b.key.localeCompare(a.key)).slice(30);
 if(old.length)await env.BUCKET.delete(old.map(o=>o.key));
 return {created:true,day};
}
