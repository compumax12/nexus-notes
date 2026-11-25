import {getAccounts} from './runtime.mjs';
import {getChatGPTUser} from './identity';
import {input,json} from './http';
export const dynamic='force-dynamic';
export async function GET(){
 const user=await getChatGPTUser();if(!user)return json({error:'Inicia sesión.'},401);
 const service=await getAccounts();if(!await service.isAdmin(user))return json({admin:false});
 return json({admin:true,...await service.administration(user,'list')});
}
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user)return json({error:'Inicia sesión.'},401);
 const service=await getAccounts();if(!await service.isAdmin(user))return json({error:'Solo administradores.'},403);
 try{const data=await input(request);return json(await service.administration(user,data.action,data));}
 catch{return json({error:'No se pudo realizar el cambio. Comprueba los datos; no puedes modificar cuentas administradoras desde aquí.'},400);}
}
