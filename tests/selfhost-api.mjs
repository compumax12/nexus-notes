import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {setTimeout as delay} from 'node:timers/promises';
import {openStorage} from '../selfhost/storage.mjs';
import {accounts} from '../selfhost/accounts.mjs';
import {maintenanceAuthFailure} from '../lib/maintenance-auth.mjs';
const data=await mkdtemp(path.join(os.tmpdir(),'nexus-api-'));
const base='http://127.0.0.1:3097',maintenance=randomBytes(32).toString('hex');
let child,output='';
try{
 const store=openStorage({dataDirectory:data,migrationsDirectory:path.resolve('drizzle')}),service=await accounts(store.DB);
 const invitation=await service.invite('one@example.test','One'),invitation2=await service.invite('two@example.test','Two');store.close();
 child=spawn(process.execPath,['selfhost/start.mjs'],{env:{...process.env,NEXUS_DATA_DIR:data,NEXUS_ORIGIN:base,NEXUS_MAINTENANCE_TOKEN:maintenance,NEXUS_DISABLE_SCHEDULER:'1',PORT:'3097'},stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',v=>output+=v);child.stderr.on('data',v=>output+=v);
 let ready=false;for(let i=0;i<50;i++){try{const r=await fetch(base,{signal:AbortSignal.timeout(1000)});if(r.ok){ready=true;await r.text();break;}}catch{}await delay(200);}assert.ok(ready,output);
 const one={cookie:''},two={cookie:''};
 async function call(actor,url,body,extra={}){
  const r=await fetch(base+url,{method:body===undefined?'GET':'POST',signal:AbortSignal.timeout(10000),headers:{Origin:base,'Content-Type':'application/json',Cookie:actor.cookie,...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const cookie=r.headers.get('set-cookie');if(cookie)actor.cookie=cookie.split(';')[0];return {status:r.status,data:await r.json()};
 }
 const password=randomBytes(24).toString('base64url');
 assert.equal((await call(one,'/api/lock',{action:'setup',invitation,username:'user.one',password,confirm:password})).status,200);
 assert.equal((await call(two,'/api/lock',{action:'setup',invitation,username:'thief',password,confirm:password})).status,400);
 assert.equal((await call(two,'/api/lock',{action:'setup',invitation:invitation2,username:'user.two',password,confirm:password})).status,200);
 assert.equal((await call(one,'/api/lock',{action:'unlock',username:'user.one',password})).status,200);
 assert.equal((await call(two,'/api/lock',{action:'unlock',username:'user.two',password})).status,200);
 assert.equal((await call({cookie:''},'/api/users')).status,401);
 assert.equal((await call(one,'/api/users')).data.admin,false);
 assert.equal((await call(two,'/api/users',{action:'invite',email:'bad@example.test',name:'Denied'})).status,403);
 const adminStore=openStorage({dataDirectory:data,migrationsDirectory:path.resolve('drizzle')});
 await (await accounts(adminStore.DB)).grantAdmin('user.one');adminStore.close();
 assert.equal((await call(one,'/api/users')).data.users.length,2);
 assert.equal((await call(one,'/api/users',{action:'disable',username:'user.one'})).status,400);
 assert.equal((await call(one,'/api/users',{action:'invite',email:'third@example.test',name:'Third'},{Origin:'https://evil.test'})).status,400);
 const invitation3=await call(one,'/api/users',{action:'invite',email:'third@example.test',name:'Third'});assert.equal(invitation3.status,200);
 const pending=(await call(one,'/api/users')).data.invitations;assert.equal(pending.length,1);assert.equal(pending[0].hash,undefined);assert.equal(pending[0].code,undefined);
 assert.equal((await call(one,'/api/users',{action:'revoke',email:'third@example.test'})).status,200);
 assert.equal((await call({cookie:''},'/api/lock',{action:'setup',invitation:invitation3.data.code,username:'third',password,confirm:password})).status,400);
 assert.equal((await call(one,'/api/users',{action:'disable',username:'user.two'})).status,200);
 assert.equal((await call(two,'/api/tasks')).status,401);
 assert.equal((await call(two,'/api/lock',{action:'unlock',username:'user.two',password})).status,400);
 assert.equal((await call(one,'/api/users',{action:'enable',username:'user.two'})).status,200);
 assert.equal((await call(two,'/api/tasks')).status,401);
 assert.equal((await call(two,'/api/lock',{action:'unlock',username:'user.two',password})).status,200);
 console.log('PASS: admin-only invitations, listing privacy, CSRF, revocation, protected admin, disable/session revocation and reactivation.');
 assert.equal((await call({cookie:''},'/api/tasks',undefined,{'oai-authenticated-user-id':'anything','oai-authenticated-user-email':'one@example.test'})).status,401);
 assert.equal((await call(one,'/api/lock',{action:'lock'},{Origin:'https://evil.test'})).status,400);
 const task={title:'Private test',notes:'Private',requester:'',priority:'Alta',due:'',progress:40,steps:[]};
 const saved=await call(one,'/api/tasks',task);assert.equal(saved.status,201);
 assert.equal((await call(two,'/api/tasks')).data.length,0);
 assert.equal((await call(two,'/api/tasks',{...task,id:saved.data.id})).status,404);
 assert.equal((await call(one,'/api/tasks',{...task,id:saved.data.id,sharedWith:['two@example.test']})).status,200);
 assert.equal((await call(two,'/api/tasks')).data.length,1);
 assert.equal((await call(two,'/api/tasks',{...task,id:saved.data.id,sharedWith:['third@example.test']})).status,403);
 assert.equal((await call(one,'/api/tasks',{...task,id:saved.data.id,sharedWith:[]})).status,200);
 assert.equal((await call(two,'/api/tasks')).data.length,0);
 assert.equal((await call(one,'/api/notes',{title:'Note',content:'Text'})).status,201);
 const emergency=await call(one,'/api/recovery',{action:'generate',password});assert.equal(emergency.status,200);
 const before=one.cookie,newPassword=randomBytes(24).toString('base64url');
 assert.equal((await call({cookie:''},'/api/recovery',{action:'redeem',username:'user.two',code:emergency.data.code,newPassword,confirm:newPassword})).status,400);
 assert.equal((await call({cookie:''},'/api/recovery',{action:'redeem',username:'user.one',code:emergency.data.code,newPassword,confirm:newPassword})).status,200);
 assert.equal((await call({cookie:before},'/api/tasks')).status,401);
 assert.equal((await call({cookie:''},'/api/recovery',{action:'redeem',username:'user.one',code:emergency.data.code,newPassword,confirm:newPassword})).status,400);
 assert.equal((await call(one,'/api/lock',{action:'unlock',username:'user.one',password:newPassword})).status,200);
 assert.equal((await call(one,'/api/cloud-backups',{})).status,200);
 const list=await call(one,'/api/cloud-backups');assert.equal(list.status,200);const day=list.data.snapshots[0].day;
 const backup=await call(one,'/api/cloud-backups?day='+day);assert.equal(backup.status,200);assert.equal(backup.data.taskCount,1);assert.equal(backup.data.noteCount,1);
 assert.equal((await call(two,'/api/cloud-backups?day='+day)).status,404);
 assert.equal((await call({cookie:''},'/api/cloud-backups')).status,401);
 assert.equal((await call(one,'/api/cloud-backups',{}, {Origin:'https://evil.test'})).status,403);
 assert.deepEqual((await call(two,'/api/cloud-backups')).data.snapshots,[]);
 for(const method of ['GET','POST']){
  for(const headers of [
   {},
   {Cookie:one.cookie},
   {Authorization:'Bearer '+ 'x'.repeat(maintenance.length)},
   {Authorization:'Bearer '+ 'é'.repeat(maintenance.length)},
   {Authorization:'Bearer '+maintenance,Origin:base},
  ])assert.equal((await fetch(base+'/api/maintenance',{method,headers})).status,401,'maintenance must reject invalid credentials and browser requests');
 }
 assert.equal((await fetch(base+'/api/maintenance',{method:'POST'})).status,401);
 const selfhostAuthOptions={missingSecretStatus:401,allowedHeaders:['authorization']};
 const selfhostRequest=()=>new Request(base+'/api/maintenance',{headers:{Authorization:'Bearer '+maintenance}});
 for(const absent of [undefined,'x'.repeat(31)]){
  const denied=maintenanceAuthFailure(selfhostRequest(),absent,selfhostAuthOptions);
  assert.equal(denied?.status,401,'selfhost missing/short secret must remain 401');
  assert.ok(!denied.error.includes(maintenance));
 }
 const sitesOnly=maintenanceAuthFailure(new Request(base+'/api/maintenance',{headers:{'OAI-Sites-Authorization':'Bearer '+maintenance}}),maintenance,selfhostAuthOptions);
 assert.equal(sitesOnly?.status,401,'selfhost must not accept the Sites-only bearer header');
 assert.ok(!sitesOnly.error.includes(maintenance));
 let r=await fetch(base+'/api/maintenance',{method:'POST',headers:{Authorization:'Bearer '+maintenance}});assert.equal(r.status,200);assert.equal((await r.json()).failed,0);
 r=await fetch(base+'/api/maintenance',{headers:{Authorization:'Bearer '+maintenance}});assert.equal((await r.json()).lastRun.failed,0);
 const otherBackup=await call(two,'/api/cloud-backups?day='+day);
 assert.equal(otherBackup.status,200);assert.equal(otherBackup.data.taskCount,0);assert.equal(otherBackup.data.noteCount,0);
 console.log('PASS: backup owner isolation, anonymous/CSRF rejection, maintenance token validation and browser-origin rejection.');
 if(process.argv[2]){
  const real=JSON.parse(await readFile(process.argv[2],'utf8'));
  const imported=await call(two,'/api/backup',real);assert.equal(imported.status,200);assert.equal(imported.data.created,real.tasks.length+(real.notes?.length||0));
  const again=await call(two,'/api/backup',real);assert.equal(again.data.created,0);
  const actual=(await call(two,'/api/tasks')).data;
  const view=t=>JSON.stringify({title:t.title,notes:t.notes,due:t.due,priority:t.priority,requester:t.requester,steps:t.steps||[],progress:t.steps?.length?Math.round(t.steps.filter(s=>s.done).length/t.steps.length*100):t.progress,recurrence:t.recurrence||'none'});
  assert.deepEqual(actual.map(view).sort(),real.tasks.map(view).sort());for(const t of actual){assert.equal(t.isOwner,true);assert.deepEqual(t.sharedWith,[]);}
  console.log('PASS: real backup restored privately into standalone SQLite with matching content and no duplicates.');
 }
 assert.equal((await call({cookie:''},'/api/sharing-defaults')).status,401);
 assert.equal((await call(one,'/api/sharing-defaults',{emails:['two@example.test']},{Origin:'https://evil.test'})).status,403);
 assert.equal((await call(one,'/api/sharing-defaults',{emails:['invalid']})).status,400);
 assert.equal((await call(one,'/api/sharing-defaults',{emails:[' TWO@example.test ','one@example.test','two@example.test']})).status,200);
 assert.deepEqual((await call(one,'/api/sharing-defaults')).data.emails,['two@example.test']);
 assert.deepEqual((await call(two,'/api/sharing-defaults')).data.emails,[]);
 const autoTask=await call(one,'/api/tasks',{...task,title:'Automatic task',sharedWith:[]});assert.equal(autoTask.status,201);assert.deepEqual(autoTask.data.sharedWith,['two@example.test']);
 const autoNote=await call(one,'/api/notes',{title:'Automatic note',content:'Shared content',sharedWith:[]});assert.equal(autoNote.status,201);
 assert.ok((await call(two,'/api/notes')).data.some(n=>n.id===autoNote.data.id));
 assert.equal((await call(two,'/api/tasks',{...task,id:autoTask.data.id,title:'Collaborator update'})).status,200);
 assert.deepEqual((await call(one,'/api/tasks')).data.find(t=>t.id===autoTask.data.id).sharedWith,['two@example.test']);
 assert.equal((await call(one,'/api/sharing-defaults',{emails:[]})).status,200);
 const afterOff=await call(one,'/api/tasks',{...task,title:'Private after off'});assert.deepEqual(afterOff.data.sharedWith,[]);
 assert.ok((await call(two,'/api/tasks')).data.some(t=>t.id===autoTask.data.id));
 assert.equal((await call(one,'/api/tasks',{...task,id:autoTask.data.id,sharedWith:[]})).status,200);
 assert.ok(!(await call(two,'/api/tasks')).data.some(t=>t.id===autoTask.data.id));
 console.log('PASS: automatic sharing persistence, owner isolation, CSRF, validation, new tasks/notes, collaborator updates, disabling and per-task revocation.');
 const html=await (await fetch(base,{headers:{Cookie:one.cookie}})).text();assert.ok(html.includes('Nexus'));assert.ok(!html.includes('Internal Server Error'));
 const unhealthy=await fetch(base+'/api/health');assert.equal(unhealthy.status,200);
 for(let i=0;i<5;i++)assert.equal((await call(two,'/api/lock',{action:'unlock',username:'user.two',password:'wrong'})).status,400);
 assert.equal((await call(two,'/api/lock',{action:'unlock',username:'user.two',password})).status,400,'known account must be throttled');
 console.log('PASS: standalone login/invitations, spoofed identity rejection, CSRF, privacy/sharing/revocation, one-use recovery, session revocation, local backups and authenticated maintenance.');
}catch(error){console.error(output.slice(-4000));throw error;}finally{if(child){const ended=new Promise(resolve=>child.once('exit',resolve));child.kill();await ended;}await rm(data,{recursive:true,force:true});}
