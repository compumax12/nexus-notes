import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {input,rateLimitKey,consumeRateLimit,resetRateLimit,rateLimitSize,rateLimitMaxKeys} from '../selfhost/http.ts';

const origen='https://limite.example';
const origenAnterior=process.env.NEXUS_ORIGIN,cabeceraConfiableAnterior=process.env.NEXUS_TRUSTED_IP_HEADER;
process.env.NEXUS_ORIGIN=origen;
delete process.env.NEXUS_TRUSTED_IP_HEADER;
const hash=value=>createHash('sha256').update(value).digest('hex');
const reloj=1_000_000;
const identidad=usuario=>({userId:usuario});
function solicitud({cabecerasIp={},usuarioCrudo='',cookie=''}={}){
 const cabeceras={'Content-Type':'application/json',Origin:origen,...cabecerasIp};
 if(cookie)cabeceras.Cookie=cookie;
 if(usuarioCrudo)cabeceras['oai-authenticated-user-id']=usuarioCrudo;
 return new Request(origen+'/api/tareas',{method:'POST',headers:cabeceras,body:JSON.stringify({marcador:true})});
}
const consumir=(opciones={},ahora=reloj,identidadVerificada)=>consumeRateLimit(solicitud(opciones),ahora,identidadVerificada);
const suplantaciones=[
 {},
 {cabecerasIp:{'CF-Connecting-IP':'ip-falsa-uno'}},
 {cabecerasIp:{'X-Forwarded-For':'ip-falsa-dos, ip-posterior'}},
 {cabecerasIp:{'X-Real-IP':'ip-falsa-tres'}},
];

try{
 // Con la configuración por defecto, IP y cuenta se hashean y la IP no se lee de cabeceras.
 resetRateLimit();
 const claveAnonima=rateLimitKey(solicitud());
 assert.equal(claveAnonima,`${hash('untrusted')}_${hash('anonymous')}`);
 assert.equal(rateLimitKey(solicitud(),identidad('cuenta-verificada')),`${hash('untrusted')}_${hash('cuenta-verificada')}`);
 assert.ok(!claveAnonima.includes('untrusted')&&!claveAnonima.includes('anonymous'),'los marcadores se guardan hasheados');

 // 120 intentos pasan y el 121 se rechaza con reloj inyectado.
 resetRateLimit();
 for(let i=0;i<120;i++)assert.equal(consumir({},reloj,identidad('cuota-unica')),true);
 assert.equal(consumir({},reloj,identidad('cuota-unica')),false);
 assert.equal(rateLimitSize(),1);

 // Cuentas verificadas distintas tienen cuotas separadas aunque compartan red.
 resetRateLimit();
 for(const usuario of ['cuenta-a','cuenta-b']){
  for(let i=0;i<120;i++)assert.equal(consumir({},reloj,identidad(usuario)),true);
  assert.equal(consumir({},reloj,identidad(usuario)),false);
 }
 assert.equal(rateLimitSize(),2);

 // Sin identidad verificada, todas las peticiones comparten el cubo anónimo.
 resetRateLimit();
 for(let i=0;i<120;i++)assert.equal(consumir(suplantaciones[i%suplantaciones.length],reloj),true);
 assert.equal(consumir({},reloj),false);
 assert.equal(rateLimitSize(),1);

 // Las cabeceras de IP falsificadas no crean cubos nuevos por defecto.
 resetRateLimit();
 for(const opciones of suplantaciones)assert.equal(rateLimitKey(solicitud(opciones)),claveAnonima);
 for(let i=0;i<120;i++)assert.equal(consumir(suplantaciones[i%suplantaciones.length],reloj),true);
 assert.equal(consumir({cabecerasIp:{'CF-Connecting-IP':'otra-ip-falsa'}},reloj),false);
 assert.equal(rateLimitSize(),1);

 // La cookie y la cabecera de usuario crudas tampoco crean cubos nuevos.
 resetRateLimit();
 for(const opciones of [
  {cookie:'mi-avance-unlock=cookie-cruda'},
  {usuarioCrudo:'visitante-crudo'},
  {cookie:'mi-avance-unlock=otra-cookie',usuarioCrudo:'otro-visitante'},
 ]){
  assert.equal(rateLimitKey(solicitud(opciones)),claveAnonima);
  assert.equal(consumir(opciones,reloj),true);
 }
 assert.notEqual(rateLimitKey(solicitud({cookie:'mi-avance-unlock=cookie-cruda'}),identidad('verificado')),claveAnonima);
 assert.equal(rateLimitSize(),1);

 // Solo la cabecera configurada por el operador se usa, y se guarda hasheada.
 process.env.NEXUS_TRUSTED_IP_HEADER='x-nexus-ip-de-confianza';
 const ipConfiable=opciones=>({cabecerasIp:{'X-Nexus-IP-De-Confianza':opciones}});
 const claveIpA=rateLimitKey(solicitud(ipConfiable(' ip-de-prueba-a , ip-posterior ')));
 const claveIpB=rateLimitKey(solicitud(ipConfiable('ip-de-prueba-b')));
 assert.equal(claveIpA,`${hash('ip-de-prueba-a')}_${hash('anonymous')}`);
 assert.equal(claveIpB,`${hash('ip-de-prueba-b')}_${hash('anonymous')}`);
 assert.notEqual(claveIpA,claveIpB);
 assert.ok(!claveIpA.includes('ip-de-prueba-a'),'la IP de confianza nunca se guarda en claro');
 resetRateLimit();
 for(let i=0;i<120;i++)assert.equal(consumir(ipConfiable('ip-de-prueba-a'),reloj),true);
 assert.equal(consumir(ipConfiable('ip-de-prueba-a'),reloj),false);
 assert.equal(consumir(ipConfiable('ip-de-prueba-b'),reloj),true);
 assert.equal(rateLimitSize(),2);
 delete process.env.NEXUS_TRUSTED_IP_HEADER;

 // Las ventanas vencidas se barren, pero una ventana fresca conserva su contador.
 resetRateLimit();
 const a=identidad('limpieza-a'),b=identidad('limpieza-b');
 assert.equal(consumir({},reloj,a),true);
 assert.equal(consumir({},reloj,b),true);
 assert.equal(consumir({},reloj+60000,a),true); // barre las vencidas, queda a
 assert.equal(rateLimitSize(),1);
 for(let i=0;i<120;i++)assert.equal(consumir({},reloj+119999,b),true); // b fresca y agotada
 assert.equal(rateLimitSize(),2);
 assert.equal(consumir({},reloj+120000,a),true); // barre a, conserva b
 assert.equal(rateLimitSize(),2,'la ventana fresca sobrevive');
 assert.equal(consumir({},reloj+120000,b),false,'y conserva su contador');

 // LRU: cada consumo refresca la posición y el número de claves nunca excede el máximo.
 resetRateLimit();
 const maximo=rateLimitMaxKeys();
 assert.equal(maximo,10000);
 for(let i=0;i<maximo;i++){
  assert.equal(consumir({},reloj,identidad(`usuario-${i}`)),true);
  assert.ok(rateLimitSize()<=maximo,'el mapa no supera el máximo');
 }
 for(let i=1;i<120;i++)assert.equal(consumir({},reloj,identidad('usuario-0')),true);
 assert.equal(consumir({},reloj,identidad('usuario-0')),false);
 assert.equal(consumir({},reloj,identidad('usuario-nuevo')),true);
 assert.equal(rateLimitSize(),maximo);
 assert.equal(consumir({},reloj,identidad('usuario-0')),false,'la clave refrescada sobrevive a la expulsión');
 assert.equal(consumir({},reloj,identidad('usuario-1')),true,'la clave más antigua se expulsa primero');
 assert.ok(rateLimitSize()<=maximo);

 // Integración: `input` aplica el mismo límite con la identidad verificada.
 resetRateLimit();
 for(let i=0;i<120;i++)await input(solicitud(),identidad('integracion'));
 await assert.rejects(input(solicitud(),identidad('integracion')),/Demasiadas solicitudes\. Reintenta en un minuto\./);
 console.log('PASS: cuotas de 120 por minuto con reloj inyectado, cuentas verificadas separadas, cubo anónimo agrupado, IP y usuario crudos no fiables, cabecera de confianza hasheada, LRU acotado y límite aplicado por input().');
}finally{
 if(origenAnterior===undefined)delete process.env.NEXUS_ORIGIN;else process.env.NEXUS_ORIGIN=origenAnterior;
 if(cabeceraConfiableAnterior===undefined)delete process.env.NEXUS_TRUSTED_IP_HEADER;else process.env.NEXUS_TRUSTED_IP_HEADER=cabeceraConfiableAnterior;
}
