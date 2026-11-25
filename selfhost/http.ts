export const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
let windowStart=0,attempts=0;
export async function input(request:Request){
 const origin=process.env.NEXUS_ORIGIN;
 if(!origin||request.headers.get('origin')!==origin)throw new Error('Origen no permitido.');
 const now=Date.now();if(now-windowStart>=60000){windowStart=now;attempts=0;}
 if(++attempts>120)throw new Error('Demasiadas solicitudes. Reintenta en un minuto.');
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw new Error('Formato no permitido.');
 const reader=request.body?.getReader();if(!reader)throw new Error('Solicitud vacía.');
 const chunks:Uint8Array[]=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();throw new Error('Solicitud demasiado grande.');}chunks.push(value);}
 return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
