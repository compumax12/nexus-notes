"use client";
import Recovery from "./recovery";
import {useState} from "react";
import {LockKeyhole, Layers} from "lucide-react";
export default function LockScreen({setup}:{setup:boolean}) {
  const [recover,setRecover]=useState(false);
  const [recovered,setRecovered]=useState("");
  const [username,setUsername]=useState("");
  const [password,setPassword]=useState("");
  const [confirm,setConfirm]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  async function submit(event:React.FormEvent) {
    event.preventDefault(); if(busy) return;
    setError("");setBusy(true);
    try {
      const response=await fetch("/api/lock",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:setup?"setup":"unlock",username,password,confirm})});
      const data=await response.json() as {error?:string};
      if(!response.ok) throw new Error(data.error || "No se pudo desbloquear la app.");
      setPassword("");setConfirm("");window.location.replace("/");
    } catch(e) {setError(e instanceof TypeError?"No hay conexión. Reintenta sin cerrar el formulario.":e instanceof Error?e.message:"No se pudo acceder.");setBusy(false);}
  }
  return <main className="lock-page">
    <div className="login-layout split">
      <aside className="login-story">
        <div className="lock-brand">
          <span className="brand-icon"><Layers size={24} aria-hidden="true"/></span>
          Nexus Notes
        </div>
        <div className="login-message">
          <p className="login-message-title">Entra para ver tus tareas y apuntes.</p>
          <p className="muted">Tareas, apuntes y avances en un solo lugar.</p>
        </div>
        <div className="login-pills">
          <span className="tag">Tareas</span>
          <span className="tag">Apuntes</span>
          <span className="tag">Avances</span>
        </div>
      </aside>
      <section className="panel lock-card stack" aria-labelledby="lock-title">
        <span className="lock-emblem accent"><LockKeyhole size={28} aria-hidden="true"/></span>
        <div className="section-head">
          <h1 id="lock-title">{setup?"Protege tus avances":"Bienvenido de nuevo"}</h1>
          <p className="muted">{setup?"Crea tu usuario y una contraseña adicional para proteger tus tareas después de iniciar sesión con ChatGPT.":"Tu cuenta de ChatGPT está conectada. Ingresa tus datos para desbloquear tus tareas."}</p>
        </div>
        {recovered&&<p className="success" role="status">{recovered}</p>}
        {recover?<Recovery mode="redeem" onDone={name=>{setUsername(name);setRecover(false);setRecovered(`Contraseña restablecida. Tu usuario es ${name}. Inicia sesión y genera un nuevo código de emergencia.`);}}/>:
          <form className="stack" onSubmit={submit}>
            <label className="stack" htmlFor="lock-usuario">
              <span>Usuario</span>
              <input id="lock-usuario" className="field" autoComplete="username" required minLength={3} maxLength={60} pattern="[a-zA-Z0-9._-]{3,60}" value={username} onChange={e=>setUsername(e.target.value)} placeholder="Ej. nombre.apellido" autoCapitalize="none" spellCheck={false}/>
            </label>
            <label className="stack" htmlFor="lock-clave">
              <span>{setup?"Crear contraseña":"Contraseña"}</span>
              <input id="lock-clave" className="field" type="password" autoComplete={setup?"new-password":"current-password"} required minLength={setup?12:1} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)}/>
            </label>
            {setup&&<>
              <label className="stack" htmlFor="lock-confirmacion">
                <span>Repetir contraseña</span>
                <input id="lock-confirmacion" className="field" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={confirm} onChange={e=>setConfirm(e.target.value)}/>
              </label>
              <p className="muted lock-hint">Usa al menos 12 caracteres. Guarda estos datos en tu gestor de contraseñas: después de entrar, genera tu código de emergencia en Configuración.</p>
            </>}
            {error&&<div className="alert" role="alert">{error}</div>}
            <button className="action action-primary" disabled={busy} type="submit">{busy?"Verificando…":setup?"Crear acceso y entrar":"Desbloquear mi espacio"}</button>
          </form>}
        {!setup&&<button type="button" className="action action-quiet" onClick={()=>{setRecover(!recover);setError("");}}>{recover?"Volver al ingreso":"Olvidé mi usuario o contraseña"}</button>}
        <p className="muted lock-hint">El acceso se mantiene durante 12 horas en este dispositivo. Puedes bloquearlo antes desde la app.</p>
        <a className="action action-quiet" href="/signout-with-chatgpt?return_to=%2F" target="_top">Cerrar sesión de ChatGPT</a>
      </section>
    </div>
  </main>;
}
