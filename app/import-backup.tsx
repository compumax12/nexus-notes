"use client";
import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { backupSchema, MAX_BACKUP_BYTES, type Backup } from "./backup";
export default function ImportBackup({onImported,onLocked}:{onImported:()=>Promise<void>;onLocked:()=>void}) {
  const [backup,setBackup]=useState<Backup|null>(null);
  const [filename,setFilename]=useState("");const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");const [result,setResult]=useState("");
  const fileInput=useRef<HTMLInputElement>(null);const sequence=useRef(0);
  async function select(file?:File){
    const version=++sequence.current;setBackup(null);setError("");setResult("");setFilename(file?.name ?? "");if(!file)return;
    if(file.size>MAX_BACKUP_BYTES){setError("El archivo supera 5 MB.");return;}
    try{const parsed=backupSchema.safeParse(JSON.parse(await file.text()));if(version!==sequence.current)return;if(!parsed.success){setError("Respaldo incompatible o dañado. Selecciona un respaldo de Nexus Notes con hasta 200 tareas y 200 apuntes.");return;}setBackup(parsed.data);}
    catch{if(version===sequence.current)setError("No se pudo leer el archivo JSON.");}
  }
  async function restore(){
    if(!backup || busy)return;setBusy(true);setError("");setResult("");
    try{
      const response=await fetch("/api/backup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(backup)});
      const data=await response.json() as {error?:string;created:number;skipped:number};
      if(response.status===401 || response.status===423){onLocked();return;}
      if(!response.ok)throw new Error(data.error || "No se pudo importar.");
      setResult(`Restauración completada: ${data.created} copias privadas creadas y ${data.skipped} ya restauradas omitidas.`);
      setBackup(null);setFilename("");if(fileInput.current)fileInput.current.value="";
      await onImported();
    }catch(e){setError(e instanceof TypeError?"No se pudo confirmar la restauración. Reintenta con el mismo archivo; no se duplicarán sus copias.":e instanceof Error?e.message:"No se pudo importar.");}
    finally{setBusy(false);}
  }
  return <article className="panel settings-card"><Upload size={23}/><h2>Importar respaldo</h2><p>Recupera tus tareas y apuntes como copias privadas. No reemplaza datos actuales ni restablece permisos compartidos. Incluye notas, pasos y avances.</p>
    <label className="backup-file">Seleccionar archivo JSON<input ref={fileInput} type="file" accept=".json,application/json" disabled={busy} onChange={e=>void select(e.target.files?.[0])}/></label><p>Hasta 5 MB y 200 tareas y 200 apuntes por archivo.</p>
    {backup && <div className="backup-preview"><strong>{filename}</strong><p>{backup.tasks.length} tareas y {backup.notes.length} apuntes · Respaldo del {new Date(backup.exportedAt).toLocaleString("es-PE",{timeZone:"America/Lima"})}</p><ul>{backup.tasks.slice(0,5).map((task,index)=><li key={index}>{task.title} · {task.progress}%</li>)}{backup.notes.slice(0,5).map((note,index)=><li key={`note-${index}`}>Apunte: {note.title}</li>)}</ul>{backup.tasks.length>5&&<p>Y {backup.tasks.length-5} tareas más.</p>}<p>Reimportar el mismo contenido no crea las mismas copias otra vez.</p><button className="primary" disabled={busy || !(backup.tasks.length+backup.notes.length)} onClick={restore}>{busy?"Restaurando…":`Restaurar ${backup.tasks.length+backup.notes.length} elementos como privados`}</button></div>}
    <div aria-live="polite">{error&&<p className="alert">{error}</p>}{result&&<p className="success">{result}</p>}</div>
  </article>;
}
