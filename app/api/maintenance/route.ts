import { env } from "cloudflare:workers";
import { maintenanceAuthFailure } from "../../../lib/maintenance-auth";
import { createCloudBackup } from "../../cloud-backup-service";
export const dynamic="force-dynamic";
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{"Cache-Control":"no-store"}});
// Explicit service-token auth supports shared Sites audiences; visitor identity headers are ignored.
function authFailure(request:Request){
 const secret=(env as unknown as {NEXUS_MAINTENANCE_TOKEN?:string}).NEXUS_MAINTENANCE_TOKEN;
 return maintenanceAuthFailure(request,secret);
}
export async function POST(request:Request){
 const denied=authFailure(request);
 if(denied)return json({error:denied.error},denied.status);
 if(!env.DB||!env.BUCKET)return json({ok:false,error:"Storage unavailable"},503);
 try{
  const owners=await env.DB.prepare("SELECT owner FROM app_locks UNION SELECT owner FROM tasks UNION SELECT owner FROM notes").all<{owner:string}>();
  let created=0,existing=0,failed=0;
  for(const row of owners.results){try{const result=await createCloudBackup(row.owner);if(result.created)created++;else existing++;}catch{failed++;}}
  const report={ok:failed===0,checkedAt:new Date().toISOString(),created,existing,failed};
  await env.BUCKET.put("maintenance/latest.json",JSON.stringify(report),{httpMetadata:{contentType:"application/json"}});
  return json(report,failed?503:200);
 }catch{return json({ok:false,error:"Maintenance failed"},503);}
}
export async function GET(request:Request){
 const denied=authFailure(request);
 if(denied)return json({error:denied.error},denied.status);
 if(!env.DB||!env.BUCKET)return json({ok:false},503);
 try{await env.DB.prepare("SELECT 1").first();const report=await env.BUCKET.get("maintenance/latest.json");return json({ok:true,lastRun:report?await report.json():null});}catch{return json({ok:false},503);}
}
