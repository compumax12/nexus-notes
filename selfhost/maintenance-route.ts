import {env} from './runtime.mjs';
import {createCloudBackup} from '../app/cloud-backup-service';
import {maintenanceAuthFailure} from '../lib/maintenance-auth';
import {json} from './http';
export const dynamic='force-dynamic';
function authFailure(request:Request){
 const denied=maintenanceAuthFailure(request,process.env.NEXUS_MAINTENANCE_TOKEN,{missingSecretStatus:401,allowedHeaders:['authorization']});
 return denied?json({error:denied.error},denied.status):null;
}
export async function POST(request:Request){const denied=authFailure(request);if(denied)return denied;try{const owners=await env.DB.prepare('SELECT id FROM local_accounts WHERE active=1').all();let created=0,existing=0,failed=0;for(const owner of owners.results){try{const r=await createCloudBackup(String(owner.id));if(r.created)created++;else existing++;}catch{failed++;}}const report={ok:failed===0,checkedAt:new Date().toISOString(),created,existing,failed};await env.BUCKET.put('maintenance/latest.json',JSON.stringify(report));return json(report,failed?503:200);}catch{return json({ok:false},503);}}
export async function GET(request:Request){const denied=authFailure(request);if(denied)return denied;try{await env.DB.prepare('SELECT 1').first();const object=await env.BUCKET.get('maintenance/latest.json');return json({ok:true,lastRun:object?await object.json():null});}catch{return json({ok:false},503);}}
