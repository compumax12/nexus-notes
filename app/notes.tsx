"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, Plus, Search, X, LockKeyhole, Users, RefreshCw, Check } from "lucide-react";
import UnsavedChanges from "./unsaved-changes";
import { noteInput, type Note } from "./note-schema";
const blank:Note={title:"",content:"",sharedWith:[]};
export default function Notes({email,onLocked}:{email:string;onLocked:()=>void}) {
  const [notes,setNotes]=useState<Note[]>([]),[draft,setDraft]=useState<Note|null>(null);
  const [query,setQuery]=useState(""),[filter,setFilter]=useState("Todos"),[address,setAddress]=useState("");
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
  const [original,setOriginal]=useState("");
  const [confirmDiscard,setConfirmDiscard]=useState(false);
  const activeRef=useRef(true),onLockedRef=useRef(onLocked);
  useEffect(()=>{onLockedRef.current=onLocked;},[onLocked]);
  const dirty=!!draft&&JSON.stringify(draft)!==original;
  useEffect(()=>{if(!dirty)return;const prevent=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue="";};window.addEventListener("beforeunload",prevent);return()=>window.removeEventListener("beforeunload",prevent);},[dirty]);
  function close(){if(saving)return;if(dirty){setConfirmDiscard(true);return;}setDraft(null);setError("");}
  useEffect(()=>{if(!draft)return;const key=(e:KeyboardEvent)=>{if(e.key==="Escape")close();};window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);},[draft,dirty,saving]);
  const refresh=useCallback(async()=>{
    if(activeRef.current){setLoading(true);setError("");}
    try{const res=await fetch("/api/notes",{cache:"no-store"});if(!activeRef.current)return;if(res.status===401||res.status===423){if(activeRef.current){setNotes([]);setDraft(null);}onLockedRef.current();return;}const data=await res.json() as Note[] & {error?:string};if(!activeRef.current)return;if(!res.ok)throw new Error(data.error);if(activeRef.current)setNotes(data);}catch(e){if(activeRef.current)setError(e instanceof Error?e.message:"No se pudieron cargar tus apuntes.");}finally{if(activeRef.current)setLoading(false);}
  },[]);
  useEffect(()=>{let active=true;activeRef.current=true;queueMicrotask(()=>{if(active&&activeRef.current)void refresh();});return()=>{active=false;activeRef.current=false;};},[refresh]);
  function open(note:Note){setConfirmDiscard(false);const copy={...note,sharedWith:note.sharedWith??[]};setDraft(copy);setOriginal(JSON.stringify(copy));setAddress("");setError("");setMessage("");}
  async function save(e:React.FormEvent){e.preventDefault();if(!draft||saving)return;const parsed=noteInput.safeParse(draft);if(!parsed.success){setError("Revisa el título, contenido y correos.");return;}setSaving(true);setError("");try{const res=await fetch("/api/notes",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(parsed.data)});const data=await res.json() as Note & {error?:string};if(res.status===401||res.status===423){setNotes([]);setDraft(null);onLocked();return;}if(!res.ok)throw new Error(data.error);setNotes(old=>[data,...old.filter(n=>n.id!==data.id)]);setDraft(null);setMessage("Apunte guardado.");}catch(e){setError(e instanceof TypeError?"No hay conexión. Tu texto se conserva; vuelve a guardar.":e instanceof Error?e.message:"No se pudo guardar.");}finally{setSaving(false);}}
  function addPerson(){if(!draft)return;const next=address.trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)){setError("Escribe un correo válido.");return;}if(next===email.toLowerCase()){setError("Este apunte ya te pertenece.");return;}setDraft({...draft,sharedWith:[...new Set([...(draft.sharedWith??[]),next])]});setAddress("");setError("");}
  const visible=notes.filter(n=>(filter==="Todos"||(filter==="Privados"?!n.shared:n.shared))&&`${n.title} ${n.content}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  return <section className="notes-section stack" aria-label="Apuntes">
    <div className="panel panel-quiet notes-controls">
      <div className="section-head section-title">
        <div className="notes-tabs">
          {["Todos","Privados","Compartidos"].map(f=><button key={f} className={`action action-quiet${filter===f?" selected":""}`} aria-pressed={filter===f} onClick={()=>setFilter(f)}>{f}</button>)}
        </div>
        <button className="action action-primary" onClick={()=>open(blank)}><Plus size={17}/> Nuevo apunte</button>
      </div>
      <div className="notes-search-row">
        <label className="search"><Search size={16}/><input placeholder="Buscar por título o contenido…" aria-label="Buscar apuntes" value={query} onChange={e=>setQuery(e.target.value)}/></label>
        <span className="muted">{visible.length} apuntes</span>
        <button className="action action-quiet refresh" aria-label="Actualizar apuntes" disabled={loading} onClick={refresh}><RefreshCw size={16} className={loading?"spin":""}/></button>
      </div>
    </div>
    {!draft&&error&&<p role="alert" className="alert">{error} <button className="action action-quiet" onClick={refresh}>Reintentar</button></p>}
    <div aria-live="polite">{message&&<p className="success">{message}</p>}</div>
    {loading&&!notes.length ? <div className="panel panel-quiet empty">Cargando apuntes…</div> : !visible.length ? <div className="panel panel-quiet empty stack">
      <span className="empty-icon"><BookOpen size={26}/></span>
      <h3>{notes.length?"No hay apuntes con este filtro":"No hay apuntes guardados"}</h3>
      <p className="muted">Guarda soluciones, ideas y recordatorios sin convertirlos en tareas. Los apuntes nuevos respetan tus destinatarios de Compartir automáticamente; si no configuraste ninguno, serán privados.</p>
      <button className="action action-primary" onClick={()=>open(blank)}><Plus size={16}/> Crear apunte</button>
    </div> : <div className="notes-grid">{visible.map(n=><button key={n.id} className="note-card panel" onClick={()=>open(n)}>
      <span className="note-card-top">
        <BookOpen size={18}/>
        <span className="tag">{n.shared?<><Users size={12}/> Compartido</>:<><LockKeyhole size={12}/> Privado</>}</span>
      </span>
      <h2>{n.title}</h2>
      <p>{n.content||"Sin contenido todavía."}</p>
      <span className="note-card-bottom row-meta">
        <span>{n.updatedAt?new Date(n.updatedAt).toLocaleDateString("es-PE",{timeZone:"America/Lima",day:"numeric",month:"short",year:"numeric"}):""}{n.isOwner===false?" · Compartido contigo":""}</span>
      </span>
    </button>)}</div>}
    {draft&&<div className="modal-backdrop"><section className="modal note-modal panel" role="dialog" aria-modal="true" aria-labelledby="note-title">
      <div className="section-head section-title modal-title">
        <div className="stack">
          <span className="muted">Tu libreta personal</span>
          <h2 id="note-title">{draft.id?"Editar apunte":"Nuevo apunte"}</h2>
        </div>
        <button className="action action-quiet" disabled={saving} onClick={close} aria-label="Cerrar apunte"><X size={20}/></button>
      </div>
      {confirmDiscard&&<UnsavedChanges onKeep={()=>setConfirmDiscard(false)} onDiscard={()=>{setConfirmDiscard(false);setDraft(null);setError("");}}/>}
      <form className="stack" onSubmit={save}>
        <label className="field">Título<input autoFocus required maxLength={160} placeholder="Ej. Solución para la impresora de Contabilidad" value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></label>
        <label className="field">Contenido<textarea rows={10} maxLength={10000} placeholder="Escribe tus ideas, instrucciones o lo que quieras recordar…" value={draft.content} onChange={e=>setDraft({...draft,content:e.target.value})}/></label>
        <p className="note-count muted">{draft.content.length.toLocaleString("es-PE")} / 10 000 caracteres</p>
        <section className="sharing-editor panel panel-quiet stack">
          <div className="section-head section-title"><h3><Users size={17}/> Privacidad del apunte</h3></div>
          {draft.isOwner===false ? <p className="muted">Te compartieron este apunte. Puedes editarlo. Solo su creador puede cambiar los permisos.</p> : <>
            <p className="muted">{draft.sharedWith?.length?"Estas personas podrán leer y editar el apunte.":(draft.id ? "Privado: solo tú puedes ver este apunte." : "Al guardar se añadirán los destinatarios de Compartir automáticamente, si lo activaste en Configuración. Si no, será privado.")}</p>
            <div className="rows">{draft.sharedWith?.map(person=><div className="row" key={person}><span className="row-title">{person}</span><button type="button" className="action action-quiet" onClick={()=>setDraft({...draft,sharedWith:draft.sharedWith!.filter(p=>p!==person)})}>Quitar acceso</button></div>)}</div>
            <div className="add-step"><input type="email" aria-label="Compartir apunte con" placeholder="Correo de ChatGPT de la persona" maxLength={254} value={address} onChange={e=>setAddress(e.target.value)}/><button type="button" className="action action-quiet" onClick={addPerson} disabled={!address.trim()||(draft.sharedWith?.length??0)>=20}>Añadir persona</button></div>
            <p className="muted">Los permisos cambian al guardar. La persona también necesita acceso a Nexus Notes en Sites. Quitar acceso no elimina copias descargadas.</p>
          </>}
        </section>
        {error&&<p role="alert" className="alert">{error}</p>}
        <div className="form-footer">
          <button className="action action-quiet" type="button" disabled={saving} onClick={close}>Cancelar</button>
          <button className="action action-primary" disabled={saving} type="submit">{saving?"Guardando…":"Guardar apunte"}<Check size={16}/></button>
        </div>
      </form>
    </section></div>}
  </section>;
}
