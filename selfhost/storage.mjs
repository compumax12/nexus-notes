// Node-only compatibility layer for the D1/R2 operations used by Nexus Notes.
// Not a public HTTP server. Never expose this adapter or its data directory.
import { DatabaseSync } from 'node:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import path from 'node:path';

export function openStorage({dataDirectory,migrationsDirectory}) {
 if(!path.isAbsolute(dataDirectory)||!path.isAbsolute(migrationsDirectory))throw new Error('Storage paths must be absolute');
 fs.mkdirSync(dataDirectory,{recursive:true,mode:0o700});
 const root=fs.realpathSync(dataDirectory);
 const sqlite=new DatabaseSync(path.join(root,'nexus.sqlite'));
 sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
 sqlite.exec('CREATE TABLE IF NOT EXISTS _nexus_migrations (name TEXT PRIMARY KEY, sha256 TEXT NOT NULL)');
 try {
  const journal=JSON.parse(fs.readFileSync(path.join(migrationsDirectory,'meta','_journal.json'),'utf8'));
  for(const entry of journal.entries){
   if(!/^[a-zA-Z0-9_-]+$/.test(entry.tag))throw new Error('Invalid migration name');
   const sql=fs.readFileSync(path.join(migrationsDirectory,entry.tag+'.sql'),'utf8');
   const hash=createHash('sha256').update(sql).digest('hex');
   const old=sqlite.prepare('SELECT sha256 FROM _nexus_migrations WHERE name=?').get(entry.tag);
   if(old){if(old.sha256!==hash)throw new Error('Previously applied migration changed: '+entry.tag);continue;}
   sqlite.exec('BEGIN IMMEDIATE');
   try{sqlite.exec(sql);sqlite.prepare('INSERT INTO _nexus_migrations VALUES (?,?)').run(entry.tag,hash);sqlite.exec('COMMIT');}
   catch(error){sqlite.exec('ROLLBACK');throw error;}
  }
 }catch(error){sqlite.close();throw error;}

 class Statement {
  constructor(sql,params=[]){this.sql=sql;this.params=params;}
  bind(...params){return new Statement(this.sql,params);}
  execute(){
   const stmt=sqlite.prepare(this.sql);
   const results=stmt.columns().length?stmt.all(...this.params):[];
   if(!stmt.columns().length)stmt.run(...this.params);
   const meta=sqlite.prepare('SELECT changes() AS changes,last_insert_rowid() AS last_row_id').get();
   return {results,success:true,meta};
  }
  async all(){return this.execute();}
  async run(){return this.execute();}
  async first(column){const row=this.execute().results[0];return column?(row?.[column]??null):(row??null);}
  async raw(){const stmt=sqlite.prepare(this.sql);stmt.setReturnArrays(true);return stmt.all(...this.params);}
 }
 const DB={
  prepare(sql){return new Statement(sql);},
  async batch(statements){
   // Execute synchronously within one transaction: no await can interleave requests.
   sqlite.exec('BEGIN IMMEDIATE');
   try{const result=statements.map(s=>s.execute());sqlite.exec('COMMIT');return result;}
   catch(error){sqlite.exec('ROLLBACK');throw error;}
  },
 };
 const objects=path.join(root,'objects');fs.mkdirSync(objects,{recursive:true,mode:0o700});
 function objectPath(key){
  if(typeof key!=='string'||!key||key.length>512||key.split('/').some(s=>!s||s==='.'||s==='..'||!/^[-a-zA-Z0-9_.]+$/.test(s)))throw new Error('Invalid object key');
  const target=path.resolve(objects,...key.split('/'));
  if(!target.startsWith(objects+path.sep))throw new Error('Object outside storage');
  let cursor=objects;
  for(const part of key.split('/')){cursor=path.join(cursor,part);if(fs.existsSync(cursor)&&fs.lstatSync(cursor).isSymbolicLink())throw new Error('Symlink in object path');}
  return target;
 }
 function head(key){try{const stat=fs.statSync(objectPath(key));return stat.isFile()?{key,size:stat.size,uploaded:stat.mtime}:null;}catch(e){if(e.code==='ENOENT')return null;throw e;}}
 const BUCKET={
  async head(key){return head(key);},
  async get(key){
   if(!head(key))return null;
   const buffer=fs.readFileSync(objectPath(key));
   return {...head(key),body:new Uint8Array(buffer),async json(){return JSON.parse(buffer.toString('utf8'));},async text(){return buffer.toString('utf8');}};
  },
  async put(key,value,options={}){
   if(typeof value!=='string')throw new Error('This app stores UTF-8 JSON objects only');
   const target=objectPath(key);fs.mkdirSync(path.dirname(target),{recursive:true,mode:0o700});
   const temp=target+'.tmp-'+randomUUID();
   const fd=fs.openSync(temp,'wx',0o600);
   try{fs.writeFileSync(fd,value,'utf8');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
   try{
    if(options.onlyIf?.etagDoesNotMatch==='*'){
     try{fs.linkSync(temp,target);}catch(e){if(e.code==='EEXIST')return null;throw e;}
    }else fs.renameSync(temp,target);
    return head(key);
   }finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
  },
  async list({prefix='',limit=1000}={}){
   if(prefix)objectPath(prefix.replace(/\/$/,''));
   const result=[];
   function walk(folder,relative=''){
    for(const entry of fs.readdirSync(folder,{withFileTypes:true})){
     if(entry.isSymbolicLink())throw new Error('Symlink in object storage');
     const key=relative+entry.name;
     if(entry.isDirectory())walk(path.join(folder,entry.name),key+'/');
     else if(entry.isFile()&&!entry.name.includes('.tmp-')&&key.startsWith(prefix))result.push(head(key));
    }
   }
   walk(objects);result.sort((a,b)=>a.key.localeCompare(b.key));
   if(result.length>limit)throw new Error('Listing exceeds supported limit');
   return {objects:result,truncated:false};
  },
  async delete(keys){for(const key of Array.isArray(keys)?keys:[keys]){try{fs.unlinkSync(objectPath(key));}catch(e){if(e.code!=='ENOENT')throw e;}}},
 };
 return {DB,BUCKET,close(){sqlite.close();}};
}
