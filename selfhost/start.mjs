import {getAccounts} from './runtime.mjs';
import {randomBytes} from 'node:crypto';
import {readFileSync,existsSync} from 'node:fs';
if(existsSync('.env.mail.local'))process.loadEnvFile('.env.mail.local');
const origin=new URL(process.env.NEXUS_ORIGIN||'http://127.0.0.1:3000');
if(origin.pathname!=='/'||origin.search||origin.hash)throw new Error('NEXUS_ORIGIN must be a bare origin');
if(origin.protocol!=='https:'&&!['127.0.0.1','localhost','[::1]'].includes(origin.hostname))throw new Error('HTTPS required outside localhost');
process.env.NEXUS_ORIGIN=origin.origin;
process.env.VINEXT_TRUSTED_HOSTS=origin.host;
const {startProdServer}=await import('vinext/server/prod-server');
if(process.env.NEXUS_MAINTENANCE_TOKEN_FILE)process.env.NEXUS_MAINTENANCE_TOKEN=readFileSync(process.env.NEXUS_MAINTENANCE_TOKEN_FILE,'utf8').trim();
process.env.NEXUS_MAINTENANCE_TOKEN??=randomBytes(32).toString('hex');
if(process.env.NEXUS_MAINTENANCE_TOKEN.length<32)throw new Error('Maintenance secret too short');
await getAccounts();
const {server}=await startProdServer({host:process.env.HOST||'127.0.0.1',port:Number(process.env.PORT||3000),outDir:'dist-selfhost'});
let lastDay='',running=false;
async function scheduledBackup(){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts().map(p=>[p.type,p.value]));
 const day=`${parts.year}-${parts.month}-${parts.day}`;
 if(running||Number(parts.hour)<3||lastDay===day)return;
 running=true;
 try{const r=await fetch(`http://127.0.0.1:${Number(process.env.PORT||3000)}/api/maintenance`,{method:'POST',headers:{Authorization:'Bearer '+process.env.NEXUS_MAINTENANCE_TOKEN},signal:AbortSignal.timeout(60000)});const result=await r.json();if(!r.ok||!result.ok)throw new Error();lastDay=day;console.log('Nexus backup checked: '+day);}catch{console.error('Nexus daily backup failed; retry in 5 minutes.');}finally{running=false;}
}
const timer=setInterval(scheduledBackup,300000);timer.unref();
if(process.env.NEXUS_DISABLE_SCHEDULER!=='1')void scheduledBackup();else clearInterval(timer);
const shutdown=()=>{clearInterval(timer);server.close(()=>process.exit(0));};process.once('SIGTERM',shutdown);process.once('SIGINT',shutdown);
