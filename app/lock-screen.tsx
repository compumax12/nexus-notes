"use client";
import Recovery from "./recovery";
import {useState} from "react";
import {LockKeyhole, Check, ArrowRight, Layers} from "lucide-react";
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
  return (
    <main className="lock-page">
      <div className="login-layout">
        <aside className="login-story">
          <div className="lock-brand">
            <span className="brand-icon"><Layers size={24} aria-hidden="true"/></span>
            Nexus Notes
          </div>
          <div className="login-message">
            <div className="eyebrow">TU ESPACIO PARA AVANZAR</div>
            <h2>Organiza tu día.<br/><span>Dale forma a tus ideas.</span></h2>
            <p>De tu primer pendiente al último paso.<br/>Tu trabajo y tus avances, en un solo lugar.</p>
          </div>
          <div className="login-illustration" aria-hidden="true">
            <div className="illustration-note"><i/><i/><span/></div>
            <div className="illustration-chart"><i/><i/><i/><i/></div>
            <div className="illustration-check"><Check size={35} aria-hidden="true"/></div>
          </div>
          <div className="login-pills">
            <span>Tareas</span>
            <span>Apuntes</span>
            <span>Avances</span>
          </div>
        </aside>
        <section className="lock-card" aria-labelledby="lock-title">
          <div className="lock-emblem"><LockKeyhole size={28} aria-hidden="true"/></div>
          <div className="eyebrow">TU ESPACIO PERSONAL</div>
          <h1 id="lock-title">{setup?"Protege tus avances":"Bienvenido de nuevo"}</h1>
          <p>{setup?"Crea tu usuario y una contraseña adicional para proteger tus tareas después de iniciar sesión con ChatGPT.":"Tu cuenta de ChatGPT está conectada. Ingresa tus datos para desbloquear tus tareas."}</p>
          {recovered&&<p className="success" role="status">{recovered}</p>}
          {recover?<Recovery mode="redeem" onDone={name=>{setUsername(name);setRecover(false);setRecovered(`Contraseña restablecida. Tu usuario es ${name}. Inicia sesión y genera un nuevo código de emergencia.`);}}/>:
            <form onSubmit={submit}>
              <label>Usuario<input autoComplete="username" required minLength={3} maxLength={60} pattern="[a-zA-Z0-9._-]{3,60}" value={username} onChange={e=>setUsername(e.target.value)} placeholder="Ej. nombre.apellido" autoCapitalize="none" spellCheck={false}/></label>
              <label>{setup?"Crear contraseña":"Contraseña"}<input type="password" autoComplete={setup?"new-password":"current-password"} required minLength={setup?12:1} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)}/></label>
              {setup&&<>
                <label>Repetir contraseña<input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>
                <p className="lock-hint">Usa al menos 12 caracteres. Guarda estos datos en tu gestor de contraseñas: después de entrar, genera tu código de emergencia en Configuración.</p>
              </>}
              {error&&<div className="alert" role="alert">{error}</div>}
              <button className="primary" disabled={busy} type="submit">{busy?"Verificando…":setup?"Crear acceso y entrar":"Desbloquear mi espacio"}<ArrowRight size={17} aria-hidden="true"/></button>
            </form>}
          {!setup&&<button type="button" className="lock-signout" onClick={()=>{setRecover(!recover);setError("");}}>{recover?"Volver al ingreso":"Olvidé mi usuario o contraseña"}</button>}
          <p className="lock-hint">El acceso se mantiene durante 12 horas en este dispositivo. Puedes bloquearlo antes desde la app.</p>
          <a className="lock-signout" href="/signout-with-chatgpt?return_to=%2F" target="_top">Cerrar sesión de ChatGPT</a>
        </section>
      </div>
    </main>
  );
}
