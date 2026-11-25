import {cookies} from 'next/headers';
import {getAccounts,getStorage} from './runtime.mjs';
import {emailRecovery} from './email-recovery.mjs';
import {recoveryMailer} from './mail.mjs';
import {getChatGPTUser} from './identity';
import {input,json} from './http';
export const dynamic='force-dynamic';
export async function GET(){const user=await getChatGPTUser();if(!user)return json({error:'Inicia sesión.'},401);return json(await (await getAccounts()).recoveryStatus(user));}
export async function POST(request:Request){try{
 const identity=await getChatGPTUser();
 const data=await input(request,identity),service=await getAccounts();
 if(data.action==='email-request'){
  let send;try{send=recoveryMailer();}catch{return json({error:'El correo de recuperación aún no está configurado. Contacta al administrador.'},503);}
  await (await emailRecovery(getStorage().DB,send)).request(data.email);
  return json({ok:true,message:'Si el correo corresponde a una cuenta activa, recibirás un código. Revisa también spam. Puedes solicitar otro después de un minuto.'});
 }
 if(data.action==='email-redeem'){
  const result=await (await emailRecovery(getStorage().DB,async()=>{})).redeem(data.email,data.code,data.newPassword,data.confirm);
  (await cookies()).set('mi-avance-unlock','',{path:'/',httpOnly:true,sameSite:'strict',secure:process.env.NEXUS_ORIGIN?.startsWith('https://')??false,maxAge:0});return json(result);
 }
 if(data.action==='generate')return json(await service.generate(await getChatGPTUser(),data.password));
 if(data.action==='redeem'){const result=await service.redeem(data.username,data.code,data.newPassword,data.confirm);(await cookies()).set('mi-avance-unlock','',{path:'/',httpOnly:true,sameSite:'strict',secure:process.env.NEXUS_ORIGIN?.startsWith('https://')??false,maxAge:0});return json(result);}
 return json({error:'Acción inválida.'},400);
}catch{return json({error:'Datos incorrectos o demasiados intentos. Revisa el usuario y el código o espera 15 minutos.'},400);}}
