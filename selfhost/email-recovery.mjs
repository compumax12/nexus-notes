import {randomInt,randomBytes,scrypt as derive,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(derive);
const hash=async(value,salt)=>(await scrypt(value,salt,32,{N:32768,r:8,p:1,maxmem:67108864})).toString('hex');
const normalize=value=>String(value??'').trim().toLowerCase();
export async function emailRecovery(DB,send,now=Date.now){
 await DB.prepare('CREATE TABLE IF NOT EXISTS local_email_resets (owner TEXT PRIMARY KEY, salt TEXT NOT NULL, code_hash TEXT NOT NULL, password_version TEXT NOT NULL, expires INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, sent_at INTEGER NOT NULL, window_start INTEGER NOT NULL, sends INTEGER NOT NULL)').run();
 const account=email=>DB.prepare('SELECT a.id,a.email,a.username,l.password_hash FROM local_accounts a JOIN app_locks l ON l.owner=a.id WHERE a.email=? AND a.active=1').bind(normalize(email)).first();
 return {
  async request(email){
   const r=await account(email);if(!r)return;
   const time=now(),salt=randomBytes(32).toString('hex'),code=String(randomInt(0,100000000)).padStart(8,'0'),ch=await hash(code,salt);
   const issued=await DB.prepare(`INSERT INTO local_email_resets(owner,salt,code_hash,password_version,expires,sent_at,window_start,sends) VALUES(?,?,?,?,?,?,?,1)
    ON CONFLICT(owner) DO UPDATE SET salt=excluded.salt,code_hash=excluded.code_hash,password_version=excluded.password_version,expires=excluded.expires,attempts=0,sent_at=excluded.sent_at,
    window_start=CASE WHEN local_email_resets.window_start<=? THEN excluded.window_start ELSE local_email_resets.window_start END,
    sends=CASE WHEN local_email_resets.window_start<=? THEN 1 ELSE local_email_resets.sends+1 END
    WHERE local_email_resets.sent_at<=? AND (local_email_resets.window_start<=? OR local_email_resets.sends<3) RETURNING owner`).bind(r.id,salt,ch,r.password_hash,time+600000,time,time,time-3600000,time-3600000,time-60000,time-3600000).all();
   if(!issued.results.length)return;
   try{await send(r.email,code);}catch{
    await DB.prepare("UPDATE local_email_resets SET code_hash='' WHERE owner=? AND code_hash=?").bind(r.id,ch).run();
    console.error('Nexus: no se pudo enviar el correo de recuperación. Revisa la configuración SMTP.');
   }
  },
  async redeem(email,code,password,confirm){
   const fail=()=>{throw new Error('Código incorrecto, vencido o agotado. Solicita otro.');};
   if(typeof password!=='string'||password.trim().length<12||password.length>128||password!==confirm||!/^\d{8}$/.test(code??''))fail();
   const r=await account(email);if(!r)fail();
   const reserved=await DB.prepare('UPDATE local_email_resets SET attempts=attempts+1 WHERE owner=? AND expires>? AND attempts<5 AND password_version=? AND code_hash!=? RETURNING *').bind(r.id,now(),r.password_hash,'').all();
   const reset=reserved.results[0];if(!reset)fail();
   const actual=await hash(code,reset.salt);if(!timingSafeEqual(Buffer.from(actual,'hex'),Buffer.from(reset.code_hash,'hex')))fail();
   const salt=randomBytes(32).toString('hex'),ph=await hash(password,salt);
   const result=await DB.batch([
    DB.prepare("UPDATE app_locks SET salt=?,password_hash=?,recovery_hash='',recovery_created_at='',attempts=0,window_start=0 WHERE owner=? AND password_hash=? AND EXISTS(SELECT 1 FROM local_email_resets WHERE owner=? AND code_hash=? AND expires>?) AND EXISTS(SELECT 1 FROM local_accounts WHERE id=? AND active=1) RETURNING owner").bind(salt,ph,r.id,reset.password_version,r.id,reset.code_hash,now(),r.id),
    DB.prepare('DELETE FROM unlock_sessions WHERE owner=? AND changes()=1').bind(r.id),
   ]);
   if(!result[0].results.length)fail();
   // Password-version mismatch invalidates this code and every concurrent redemption.
   return {ok:true,username:r.username};
  },
 };
}
