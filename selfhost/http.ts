import {createHash} from 'node:crypto';
export const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const LIMIT=120,WINDOW_MS=60000,MAX_KEYS=10000,UNTRUSTED='untrusted',ANONYMOUS='anonymous';
type Window={start:number;attempts:number};
type RateLimitIdentity={userId?:string|null};
const windows=new Map<string,Window>();let lastCleanup=0;
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const first=(value:string|null)=>value?.split(',')[0]?.trim()||'';
export function rateLimitKey(request:Request,identity?:RateLimitIdentity|null):string{
 // Por defecto no se confía en IP de cabeceras: cualquiera puede falsificarlas.
 // Solo se lee la cabecera configurada explícitamente por el operador, que debe
 // asegurar que su proxy la sobrescribe antes de llegar a la aplicación.
 const trustedHeader=process.env.NEXUS_TRUSTED_IP_HEADER;
 const ip=(trustedHeader?first(request.headers.get(trustedHeader)):'')||UNTRUSTED;
 // La cuenta sale únicamente de la sesión verificada; nunca de cookies ni de
 // cabeceras de identidad enviadas por el visitante.
 const account=identity?.userId||ANONYMOUS;
 return `${hash(ip)}_${hash(account)}`;
}
// `now` se puede inyectar para avanzar ventanas sin esperar ni usar servidores.
export function consumeRateLimit(request:Request,now=Date.now(),identity?:RateLimitIdentity|null):boolean{
 if(now-lastCleanup>=WINDOW_MS){for(const [key,window] of windows){if(now-window.start>=WINDOW_MS)windows.delete(key);}lastCleanup=now;}
 const key=rateLimitKey(request,identity),previous=windows.get(key);
 // Refresca la posición LRU: borrar y volver a insertar deja la clave al final.
 if(previous)windows.delete(key);
 let window=previous;
 if(!window||now-window.start>=WINDOW_MS)window={start:now,attempts:0};
 windows.set(key,window);
 while(windows.size>MAX_KEYS){const oldest=windows.keys().next().value;if(oldest===undefined)break;windows.delete(oldest);}
 return ++window.attempts<=LIMIT;
}
// Ayuda de prueba: evita que suites independientes compartan cuotas en memoria.
export function resetRateLimit():void{windows.clear();lastCleanup=0;}
export function rateLimitSize():number{return windows.size;}
export function rateLimitMaxKeys():number{return MAX_KEYS;}
export async function input(request:Request,identity?:RateLimitIdentity|null){
 const origin=process.env.NEXUS_ORIGIN;
 if(!origin||request.headers.get('origin')!==origin)throw new Error('Origen no permitido.');
 if(!consumeRateLimit(request,Date.now(),identity))throw new Error('Demasiadas solicitudes. Reintenta en un minuto.');
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw new Error('Formato no permitido.');
 const reader=request.body?.getReader();if(!reader)throw new Error('Solicitud vacía.');
 const chunks:Uint8Array[]=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();throw new Error('Solicitud demasiado grande.');}chunks.push(value);}
 return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
