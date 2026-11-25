import {randomBytes,randomUUID,createHash,scrypt as derive,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(derive);
export const digest=value=>createHash('sha256').update(value).digest('hex');
const token=()=>randomBytes(32).toString('hex');
const hash=async(password,salt)=>(await scrypt(password,salt,32,{N:32768,r:8,p:1,maxmem:64*1024*1024})).toString('hex');
const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
const invalid=()=>{throw new Error('Datos incorrectos o acceso no disponible.');};
const passwordValid=p=>typeof p==='string'&&p.trim().length>=12&&p.length<=128;
const usernameValid=u=>typeof u==='string'&&/^[a-z0-9._-]{3,60}$/.test(u);

export async function accounts(DB){
 await DB.prepare('CREATE TABLE IF NOT EXISTS local_accounts (id TEXT PRIMARY KEY,username TEXT UNIQUE NOT NULL,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1)').run();
 await DB.prepare('CREATE TABLE IF NOT EXISTS local_invites (hash TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,expires INTEGER NOT NULL)').run();
 await DB.prepare('CREATE TABLE IF NOT EXISTS local_admins (account_id TEXT PRIMARY KEY REFERENCES local_accounts(id))').run();
 async function isAdmin(identity){return !!(identity&&await DB.prepare('SELECT a.id FROM local_accounts a JOIN local_admins r ON r.account_id=a.id WHERE a.id=? AND a.active=1').bind(identity.userId).first());}
 const row=async username=>DB.prepare('SELECT a.*,l.salt,l.password_hash,l.recovery_hash,l.recovery_created_at FROM local_accounts a JOIN app_locks l ON l.owner=a.id WHERE a.username=? AND a.active=1').bind(username).first();
 async function reserve(owner){
  const now=Date.now(),cutoff=now-900000;
  const r=await DB.prepare('UPDATE app_locks SET attempts=CASE WHEN window_start<=? THEN 1 ELSE attempts+1 END,window_start=CASE WHEN window_start<=? THEN ? ELSE window_start END WHERE owner=? AND (window_start<=? OR attempts<5) RETURNING owner').bind(cutoff,cutoff,now,owner,cutoff).all();
  if(!r.results.length)throw new Error('Demasiados intentos. Espera 15 minutos.');
 }
 async function verify(username,password){
  const r=await row(username);
  if(r)await reserve(r.id);
  const computed=await hash(String(password??'').slice(0,128),r?.salt??'nonexistent-account-dummy-salt');
  if(!r||!equal(computed,r.password_hash))invalid();
  return r;
 }
 return {
  isAdmin,
  // Administrator grants stay local to the server console.
  async grantAdmin(username){const r=await row(username);if(!r)invalid();await DB.prepare('INSERT OR IGNORE INTO local_admins(account_id) VALUES(?)').bind(r.id).run();},
  async administration(identity,action,data={}){
   if(!await isAdmin(identity))throw new Error('Solo un administrador puede gestionar usuarios.');
   if(action==='list')return {
    users:(await DB.prepare('SELECT a.username,a.email,a.name,a.active,EXISTS(SELECT 1 FROM local_admins r WHERE r.account_id=a.id) AS admin FROM local_accounts a ORDER BY a.name').all()).results,
    invitations:(await DB.prepare('SELECT email,name,expires FROM local_invites WHERE expires>? ORDER BY expires DESC').bind(Date.now()).all()).results,
   };
   if(action==='invite')return {code:await this.invite(data.email,data.name)};
   if(action==='revoke'){await DB.prepare('DELETE FROM local_invites WHERE email=?').bind(String(data.email??'')).run();return {ok:true};}
   if(action==='disable'||action==='enable'){
    const target=await DB.prepare('SELECT id FROM local_accounts WHERE username=?').bind(String(data.username??'')).first();
    if(!target||target.id===identity.userId)throw new Error('No puedes desactivar tu propia cuenta.');
    if(await DB.prepare('SELECT account_id FROM local_admins WHERE account_id=?').bind(target.id).first())throw new Error('Las cuentas administradoras se gestionan desde la consola.');
    await DB.batch([DB.prepare('UPDATE local_accounts SET active=? WHERE id=?').bind(action==='enable'?1:0,target.id),DB.prepare('DELETE FROM unlock_sessions WHERE owner=?').bind(target.id)]);return {ok:true};
   }
   throw new Error('Acción inválida.');
  },
  async invite(email,name){
   email=String(email).trim().toLowerCase();name=String(name).trim();
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||!name||name.length>120)invalid();
   if(await DB.prepare('SELECT id FROM local_accounts WHERE email=?').bind(email).first())throw new Error('Ya existe una cuenta con ese correo.');
   const code=token();await DB.prepare('INSERT INTO local_invites(hash,email,name,expires) VALUES(?,?,?,?) ON CONFLICT(email) DO UPDATE SET hash=excluded.hash,name=excluded.name,expires=excluded.expires').bind(digest(code),email,name,Date.now()+86400000).run();return code;
  },
  async register({invitation,username,password,confirm}){
   username=String(username??'').trim().toLowerCase();
   if(!usernameValid(username)||!passwordValid(password)||password!==confirm||!/^[a-f0-9]{64}$/.test(invitation??''))invalid();
   const salt=token(),id=randomUUID(),ph=await hash(password,salt),ih=digest(invitation);
   const results=await DB.batch([
    DB.prepare('INSERT INTO local_accounts(id,username,email,name) SELECT ?,?,email,name FROM local_invites WHERE hash=? AND expires>? RETURNING id').bind(id,username,ih,Date.now()),
    DB.prepare('INSERT INTO app_locks(owner,username,salt,password_hash) SELECT id,username,?,? FROM local_accounts WHERE id=? AND changes()=1').bind(salt,ph,id),
    DB.prepare('DELETE FROM local_invites WHERE hash=? AND changes()=1').bind(ih),
   ]);
   if(!results[0].results.length)invalid();return {ok:true};
  },
  async login(username,password){
   username=String(username??'').trim().toLowerCase();if(!usernameValid(username)||typeof password!=='string'||password.length>128)invalid();
   const r=await verify(username,password),value=token();
   const issued=await DB.prepare('INSERT INTO unlock_sessions(token_hash,owner,expires_at) SELECT ?,owner,? FROM app_locks WHERE owner=? AND password_hash=? RETURNING owner').bind(digest(value),Date.now()+43200000,r.id,r.password_hash).all();
   if(!issued.results.length)invalid();
   await DB.prepare('UPDATE app_locks SET attempts=0,window_start=0 WHERE owner=?').bind(r.id).run();
   await DB.prepare('DELETE FROM unlock_sessions WHERE expires_at<?').bind(Date.now()).run();
   return value;
  },
  async identity(value){
   if(!/^[a-f0-9]{64}$/.test(value??''))return null;
   const r=await DB.prepare('SELECT a.id,a.email,a.name,a.username FROM local_accounts a JOIN unlock_sessions s ON s.owner=a.id WHERE s.token_hash=? AND s.expires_at>? AND a.active=1').bind(digest(value),Date.now()).first();
   return r?{userId:r.id,email:r.email,displayName:r.name,fullName:r.name,username:r.username}:null;
  },
  async logout(value){if(value)await DB.prepare('DELETE FROM unlock_sessions WHERE token_hash=?').bind(digest(value)).run();},
  async change(identity,password,newPassword,confirm){
   if(!identity||!passwordValid(newPassword)||newPassword!==confirm)invalid();
   const r=await verify(identity.username,password),salt=token(),ph=await hash(newPassword,salt);
   const result=await DB.batch([
    DB.prepare("UPDATE app_locks SET salt=?,password_hash=?,recovery_hash='',recovery_created_at='',attempts=0,window_start=0 WHERE owner=? AND password_hash=? RETURNING owner").bind(salt,ph,r.id,r.password_hash),
    DB.prepare('DELETE FROM unlock_sessions WHERE owner=? AND changes()=1').bind(r.id),
   ]);if(!result[0].results.length)invalid();
  },
  async recoveryStatus(identity){if(!identity)invalid();const r=await row(identity.username);return {configured:!!r?.recovery_hash,createdAt:r?.recovery_created_at??''};},
  async generate(identity,password){
   if(!identity)invalid();const r=await verify(identity.username,password),code=token(),createdAt=new Date().toISOString();
   const result=await DB.prepare('UPDATE app_locks SET recovery_hash=?,recovery_created_at=?,attempts=0,window_start=0 WHERE owner=? AND password_hash=? RETURNING owner').bind(digest(code),createdAt,r.id,r.password_hash).all();
   if(!result.results.length)invalid();return {code,createdAt};
  },
  async redeem(username,code,newPassword,confirm){
   if(!passwordValid(newPassword)||newPassword!==confirm)invalid();
   const r=await row(String(username??'').trim().toLowerCase());if(!r)invalid();await reserve(r.id);
   if(!/^[a-f0-9]{64}$/.test(code??'')||!r.recovery_hash||!equal(digest(code),r.recovery_hash))invalid();
   const salt=token(),ph=await hash(newPassword,salt);
   const result=await DB.batch([
    DB.prepare("UPDATE app_locks SET salt=?,password_hash=?,recovery_hash='',recovery_created_at='',attempts=0,window_start=0 WHERE owner=? AND recovery_hash=? RETURNING owner").bind(salt,ph,r.id,r.recovery_hash),
    DB.prepare('DELETE FROM unlock_sessions WHERE owner=? AND changes()=1').bind(r.id),
   ]);if(!result[0].results.length)invalid();return {username:r.username};
  },
  async disable(username){const r=await row(username);if(!r)invalid();await DB.batch([DB.prepare('UPDATE local_accounts SET active=0 WHERE id=?').bind(r.id),DB.prepare('DELETE FROM unlock_sessions WHERE owner=?').bind(r.id)]);},
 };
}
