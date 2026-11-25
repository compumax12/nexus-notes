"use client";
import { useState } from "react";
import { Download, LockKeyhole, Users } from "lucide-react";
import Recovery from "./recovery";
import CloudBackups from "./cloud-backups";
import ImportBackup from "./import-backup";
import AutomaticSharing from "./automatic-sharing";
export default function Settings({exportBackup,exporting,email,onLocked,onImported}:{exportBackup:()=>void;exporting:boolean;email:string;onLocked:()=>void;onImported:()=>Promise<void>}) {
  const [current,setCurrent]=useState("");
  const [password,setPassword]=useState("");
  const [confirm,setConfirm]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  async function change(event:React.FormEvent) {
    event.preventDefault(); if(busy) return;
    if(password !== confirm){setError("Las contraseñas nuevas no coinciden.");return;}
    setBusy(true);setError("");
    try {
      const response=await fetch("/api/lock",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"change",password:current,newPassword:password,confirm})});
      const data=await response.json() as {error?:string};
      if(response.status===423){onLocked();return;}
      if(!response.ok) throw new Error(data.error || "No se pudo cambiar la contraseña.");
      setCurrent("");setPassword("");setConfirm("");onLocked();
    } catch(e){setError(e instanceof Error?e.message:"No hay conexión. Reintenta.");}
    finally{setBusy(false);}
  }
  return <section className="settings-section stack" aria-label="Configuración">
    <div className="split settings-top">
      <AutomaticSharing/>
      <Recovery mode="generate"/>
    </div>
    <div className="split settings-bottom">
      <CloudBackups/>
      <ImportBackup onImported={onImported} onLocked={onLocked}/>
    </div>
    <article className="panel panel-quiet settings-export">
      <div className="section-head section-title"><Download size={23}/><h2>Respaldo de tus datos</h2></div>
      <p className="muted">Descarga tus apuntes y las tareas a las que tienes acceso, con sus notas, pasos y avances. El archivo indica cuáles son tuyas y cuáles te compartieron.</p>
      <button className="action action-quiet" onClick={exportBackup} disabled={exporting}>{exporting?"Preparando respaldo…":"Descargar respaldo"}</button>
    </article>
    <article className="panel settings-privacy">
      <div className="section-head section-title"><Users size={23}/><h2>Usuarios y privacidad</h2></div>
      <p className="muted">Tu cuenta: <strong>{email}</strong></p>
      <p className="muted">Cada persona entra con su propia cuenta de ChatGPT y crea su usuario y contraseña al acceder por primera vez. Sus tareas comienzan privadas.</p>
      <p className="muted">Para añadir a otra persona, el propietario debe habilitar su correo en Compartir de Sites. Después, comparte tareas concretas desde su formulario. Crear un usuario no da acceso a tus tareas.</p>
      <a className="action action-quiet" href="https://chatgpt.com/sites" target="_blank" rel="noreferrer">Administrar acceso en Sites</a>
    </article>
    <article className="panel settings-password">
      <div className="section-head section-title"><LockKeyhole size={23}/><h2>Cambiar contraseña</h2></div>
      <p className="muted">Cambia la contraseña adicional de Nexus Notes. Se cerrarán las sesiones de la app en todos tus dispositivos y volverás a entrar con la nueva contraseña.</p>
      <form className="stack" onSubmit={change}>
        <label className="field">Contraseña actual<input required type="password" autoComplete="current-password" maxLength={128} value={current} onChange={e=>setCurrent(e.target.value)}/></label>
        <label className="field">Nueva contraseña<input required type="password" autoComplete="new-password" minLength={12} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)}/></label>
        <label className="field">Repetir nueva contraseña<input required type="password" autoComplete="new-password" minLength={12} maxLength={128} value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>
        {error&&<p role="alert" className="alert">{error}</p>}
        <button className="action action-primary" disabled={busy}>{busy?"Actualizando…":"Cambiar contraseña y volver a entrar"}</button>
      </form>
    </article>
  </section>;
}
