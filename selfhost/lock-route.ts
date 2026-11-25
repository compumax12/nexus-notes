import {cookies} from 'next/headers';
import {getAccounts} from './runtime.mjs';
import {input,json} from './http';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 try{
  const service=await getAccounts(),jar=await cookies(),old=jar.get('mi-avance-unlock')?.value;
  const identity=await service.identity(old),data=await input(request,identity);
  const options={httpOnly:true,sameSite:'strict' as const,path:'/',secure:process.env.NEXUS_ORIGIN?.startsWith('https://')??false};
  if(data.action==='setup'){await service.register(data);return json({ok:true});}
  if(data.action==='unlock'){const value=await service.login(data.username,data.password);await service.logout(old);jar.set('mi-avance-unlock',value,{...options,maxAge:43200});return json({ok:true});}
  if(data.action==='lock'){await service.logout(old);jar.set('mi-avance-unlock','',{...options,maxAge:0});return json({ok:true});}
  if(data.action==='change'){const user=identity;if(!user)return json({error:'Inicia sesión.'},401);await service.change(user,data.password,data.newPassword,data.confirm);jar.set('mi-avance-unlock','',{...options,maxAge:0});return json({ok:true,locked:true});}
  return json({error:'Acción inválida.'},400);
 }catch{return json({error:'No se pudo acceder. Revisa los datos o espera 15 minutos si superaste el límite de intentos.'},400);}
}
