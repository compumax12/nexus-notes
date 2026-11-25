"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {CloudDownload} from "lucide-react";
export default function CloudBackups(){
  const [items,setItems]=useState<{day:string;bytes:number}[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
  const activeRef=useRef(true);
  const load=useCallback(async()=>{try{const r=await fetch("/api/cloud-backups",{cache:"no-store"});const d=await r.json() as {snapshots:typeof items;error?:string};if(!r.ok)throw new Error(d.error);if(activeRef.current){setItems(d.snapshots);setError("");}}catch(e){if(activeRef.current)setError(e instanceof Error?e.message:"No se pudieron cargar.");}},[]);
  useEffect(()=>{let active=true;activeRef.current=true;queueMicrotask(()=>{if(active&&activeRef.current)void load();});return()=>{active=false;activeRef.current=false;};},[load]);
  async function create(){setBusy(true);setError("");setMessage("");try{const r=await fetch("/api/cloud-backups",{method:"POST"});const d=await r.json() as {error?:string;created:boolean};if(!r.ok)throw new Error(d.error);setMessage(d.created?"Respaldo de hoy creado.":"Ya existe un respaldo de hoy; se conserva esa copia.");await load();window.dispatchEvent(new Event("nexus-backup-updated"));}catch(e){setError(e instanceof Error?e.message:"No se pudo crear.");}finally{setBusy(false);}}
  return <article className="panel panel-quiet cloud-backups stack">
    <div className="section-head section-title"><CloudDownload size={23}/><h2>Respaldos en la nube</h2></div>
    <p className="muted">Copias diarias de tus tareas y apuntes propios. Se conservan las últimas 30 copias, una por día, en almacenamiento separado de la base de trabajo.</p>
    <p className="muted">Hasta 200 tareas, 200 apuntes y 5 MB por copia. Para recuperar: descarga una copia y selecciónala en Importar respaldo. Se restaurará como contenido privado.</p>
    <button className="action action-quiet" onClick={create} disabled={busy}>{busy?"Creando…":"Crear copia de hoy"}</button>
    <div aria-live="polite" className="stack">
      {error&&<p className="alert">{error}</p>}
      {message&&<p className="success">{message}</p>}
    </div>
    {!items.length ? <p className="muted">Todavía no hay copias guardadas.</p> : <ul className="cloud-backup-list rows">
      {items.map(item=><li className="row" key={item.day}><a href={`/api/cloud-backups?day=${item.day}`} download>Descargar {item.day.split("-").reverse().join("/")}</a><span className="muted">{Math.max(1,Math.round(item.bytes/1024))} KB</span></li>)}
    </ul>}
  </article>;
}
