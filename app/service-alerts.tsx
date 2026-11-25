"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import {ShieldCheck,TriangleAlert,RefreshCw} from 'lucide-react';
import {backupState,type BackupState} from './service-status';
import {limaDate} from './task-logic';
type Connection='checking'|'ok'|'offline'|'unreachable'|'service'|'session';
export default function ServiceAlerts({details,onDetails}:{details:boolean;onDetails:()=>void}){
 const [connection,setConnection]=useState<Connection>('checking'),[backup,setBackup]=useState<BackupState>({kind:'unknown'});
 const [busy,setBusy]=useState(false),[checked,setChecked]=useState(''),[recovered,setRecovered]=useState(false);
 const running=useRef(false),failures=useRef(0),wasFault=useRef(false),active=useRef(true),controller=useRef<AbortController|null>(null);
 const check=useCallback(async()=>{
  if(running.current||!active.current)return;
  if(!navigator.onLine){setConnection('offline');wasFault.current=true;setRecovered(false);return;}
  running.current=true;setBusy(true);const abort=new AbortController();controller.current=abort;
  const timer=window.setTimeout(()=>abort.abort(),8000);
  try{
   const response=await fetch('/api/health',{cache:'no-store',signal:abort.signal});
   if(response.redirected||[401,403,423].includes(response.status)){if(active.current){setConnection('session');setRecovered(false);}return;}
   if(!response.ok)throw new Error('service');
   const health=await response.json() as {ok?:boolean};if(health.ok!==true)throw new Error('service');
   if(!active.current)return;failures.current=0;setConnection('ok');setChecked(new Date().toISOString());
   if(wasFault.current)setRecovered(true);wasFault.current=false;
   try{
    const r=await fetch('/api/cloud-backups',{cache:'no-store',signal:abort.signal});
    if(!active.current)return;
    if(r.redirected||[401,403,423].includes(r.status)){setConnection('session');setRecovered(false);return;}
    if(!r.ok)throw new Error();
    const data=await r.json() as {snapshots?:unknown};if(active.current)setBackup(backupState(data.snapshots,limaDate()));
   }catch{if(active.current)setBackup({kind:'unknown'});}
  }catch(error){
   if(active.current&&!navigator.onLine){setConnection('offline');wasFault.current=true;setRecovered(false);}else if(active.current){failures.current++;setRecovered(false);if(failures.current>=2){setConnection(error instanceof Error&&error.message==='service'?'service':'unreachable');wasFault.current=true;}else setConnection('checking');}
  }finally{window.clearTimeout(timer);running.current=false;if(active.current)setBusy(false);}
 },[]);
 useEffect(()=>{
  active.current=true;queueMicrotask(()=>{if(active.current)void check();});
  const visible=()=>{if(document.visibilityState==='visible')void check();};
  const offline=()=>{controller.current?.abort();setConnection('offline');setRecovered(false);wasFault.current=true;};
  const timer=window.setInterval(visible,60000);
  window.addEventListener('online',visible);window.addEventListener('offline',offline);window.addEventListener('focus',visible);window.addEventListener('nexus-backup-updated',visible);document.addEventListener('visibilitychange',visible);
  return()=>{active.current=false;controller.current?.abort();window.clearInterval(timer);window.removeEventListener('online',visible);window.removeEventListener('offline',offline);window.removeEventListener('focus',visible);window.removeEventListener('nexus-backup-updated',visible);document.removeEventListener('visibilitychange',visible);};
 },[check]);
 useEffect(()=>{if(!recovered)return;const timer=window.setTimeout(()=>setRecovered(false),15000);return()=>window.clearTimeout(timer);},[recovered]);
 const messages:string[]=[];
 if(connection==='offline')messages.push('Sin conexión a Internet. Conserva tus cambios sin guardar y vuelve a intentarlo al recuperar la conexión.');
 if(connection==='unreachable')messages.push('No pudimos contactar con Nexus en dos comprobaciones. Puede ser tu conexión o el servidor; no se confirmó una caída.');
 if(connection==='service')messages.push('Nexus respondió con un fallo al comprobar la base de datos o el almacenamiento. Reintenta antes de continuar.');
 if(connection==='session')messages.push('No se pudo comprobar el estado con esta sesión. Vuelve a iniciar sesión o desbloquea Nexus.');
 if(connection==='ok'&&backup.kind==='missing')messages.push('Tu cuenta todavía no tiene copias diarias guardadas. Crea una desde Configuración → Respaldos.');
 if(connection==='ok'&&backup.kind==='stale')messages.push(`Tu última copia es del ${backup.day!.split('-').reverse().join('/')}. Faltan copias recientes: crea una manual y revisa la programación.`);
 if(connection==='ok'&&backup.kind==='unknown')messages.push('No se pudo verificar tu última copia de seguridad. No significa que se haya borrado; revisa Respaldos en Configuración.');
 if(!details&&!messages.length&&!recovered)return null;
 return <section className={`service-alerts ${messages.length?'service-warning':''}`} aria-label="Estado y alertas de Nexus">
  <div className="service-alerts-title">{messages.length?<TriangleAlert size={20}/>:<ShieldCheck size={20}/>}<h2>{messages.length?'Revisa el estado de Nexus':recovered?'Conexión recuperada':'Estado de Nexus'}</h2></div>
  <div role={messages.length?'alert':'status'}>{messages.map(text=><p key={text}>{text}</p>)}{recovered&&<p>El servidor vuelve a responder. Actualiza la lista antes de repetir un guardado; los cambios pendientes no se envían automáticamente.</p>}</div>
  {details&&<><p>{connection==='ok'?'La base de datos y el almacenamiento responden a la consulta.':connection==='checking'?'Comprobando disponibilidad; aún no hay un resultado confirmado.':'Comprobación pendiente de resolver.'}</p>{connection==='ok'&&backup.kind==='ok'&&<p>Última copia diaria: {backup.day!.split('-').reverse().join('/')}.</p>}<p className="service-caption">Comprobación cada minuto mientras esta pestaña esté visible. Solo consulta el estado; no prueba la escritura ni garantiza una restauración. No envía avisos con la app cerrada.</p>{checked&&<p className="service-caption">Última respuesta correcta del servidor: {new Date(checked).toLocaleString('es-PE',{timeZone:'America/Lima'})} (Perú).</p>}</>}
  <div className="service-actions"><button type="button" className="secondary" onClick={()=>void check()} disabled={busy}><RefreshCw size={16}/>{busy?'Comprobando…':'Comprobar ahora'}</button>{!details&&<button type="button" className="secondary" onClick={onDetails}>Ver en Configuración</button>}</div>
 </section>;
}

