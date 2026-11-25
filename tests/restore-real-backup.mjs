// Run against a disposable local Worker, never production. The JSON stays outside Git.
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
const file=process.argv[2];
if(!file)throw new Error('Usage: node tests/restore-real-backup.mjs ABSOLUTE_BACKUP_PATH');
const bytes=await readFile(file), backup=JSON.parse(bytes.toString('utf8'));
const base='http://127.0.0.1:8787', owner='restore_'+randomUUID();
let cookie='';
async function call(path,body){
 const response=await fetch(base+path,{method:body===undefined?'GET':'POST',signal:AbortSignal.timeout(15000),headers:{Origin:base,'Content-Type':'application/json','oai-authenticated-user-id':owner,'oai-authenticated-user-email':owner+'@restore.test',Cookie:cookie},...(body===undefined?{}:{body:JSON.stringify(body)})});
 if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];
 return {status:response.status,data:await response.json()};
}
const password=randomUUID()+randomUUID();
assert.equal((await call('/api/lock',{action:'setup',username:owner,password,confirm:password})).status,200);
assert.equal((await call('/api/tasks')).data.length,0);
assert.equal((await call('/api/notes')).data.length,0);
const expected=backup.tasks.length+(backup.notes?.length||0);
const first=await call('/api/backup',backup);assert.equal(first.status,200);assert.equal(first.data.created,expected);
const tasks=(await call('/api/tasks')).data,notes=(await call('/api/notes')).data;
const taskView=t=>({title:t.title,notes:t.notes,requester:t.requester,priority:t.priority,due:t.due,progress:t.steps?.length?Math.round(t.steps.filter(s=>s.done).length/t.steps.length*100):t.progress,steps:t.steps||[],recurrence:t.recurrence||'none'});
const noteView=n=>({title:n.title,content:n.content});
const sorted=(rows,view)=>rows.map(x=>JSON.stringify(view(x))).sort();
assert.deepEqual(sorted(tasks,taskView),sorted(backup.tasks,taskView));
assert.deepEqual(sorted(notes,noteView),sorted(backup.notes||[],noteView));
for(const record of [...tasks,...notes]){assert.equal(record.isOwner,true);assert.deepEqual(record.sharedWith,[]);}
const second=await call('/api/backup',backup);assert.equal(second.status,200);assert.equal(second.data.created,0);assert.equal(second.data.skipped,expected);
assert.equal((await call('/api/tasks')).data.length,tasks.length);
assert.equal((await call('/api/notes')).data.length,notes.length);
console.log(JSON.stringify({result:'PASS',backupSha256:createHash('sha256').update(bytes).digest('hex'),tasks:tasks.length,notes:notes.length,private:true,duplicateImportCreates:0,productionModified:false}));
