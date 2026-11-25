"use client";
import { useEffect,useState } from "react";
import { KeyRound } from "lucide-react";
export default function Recovery({mode,onDone}:{mode:"generate"|"redeem";onDone?:(username:string)=>void}){
  const [password,setPassword]=useState(""),[code,setCode]=useState(""),[confirm,setConfirm]=useState(""),[issued,setIssued]=useState(""),[error,setError]=useState(""),[status,setStatus]=useState(""),[busy,setBusy]=useState(false);
  useEffect(()=>{if(mode==="generate")void fetch("/api/recovery",{cache:"no-store"}).then(async r=>{if(!r.ok)throw new Error();const d=await r.json() as {configured:boolean};setStatus(d.configured?"Tienes un código activo. Generar otro invalida el anterior.":"Aún no tienes un código de emergencia.");}).catch(()=>setStatus("No se pudo consultar el estado. Puedes reintentar generando tu código."));},[mode]);
  async function submit(e:React.FormEvent){e.preventDefault();if(busy)return;setBusy(true);setError("");try{const r=await fetch("/api/recovery",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(mode==="generate"?{action:mode,password}:{action:mode,code,newPassword:password,confirm})});const d=await r.json() as {error?:string;code?:string;username?:string};if(!r.ok)throw new Error(d.error);setPassword("");setConfirm("");setCode("");if(mode==="generate"){setIssued(d.code!);setStatus("Código generado. Guárdalo ahora: no se volverá a mostrar.");}else onDone?.(d.username!);}catch(e){setError(e instanceof Error?e.message:"No se pudo completar.");}finally{setBusy(false);}}
  function download(){const url=URL.createObjectURL(new Blob([`Nexus Notes — Código de emergencia\n${issued}\n\nRequiere tu cuenta de ChatGPT. Válido una sola vez. Guarda este archivo fuera de la app.\n`],{type:"text/plain;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="nexus-codigo-emergencia.txt";a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
  return <section className={mode==="generate"?"panel panel-quiet recovery-card stack":"panel recovery-form stack"}>
    <div className="section-head section-title"><KeyRound size={22}/><h2>{mode==="generate"?"Código de emergencia":"Recuperar acceso"}</h2></div>
    <p className="muted">{mode==="generate"?"Genera y guarda un código para recuperar tu usuario y restablecer la contraseña adicional. Necesitarás seguir teniendo acceso a tu cuenta de ChatGPT.":"Usa el código que guardaste en Configuración. Se consumirá al restablecer la contraseña y se cerrarán todas tus sesiones de Nexus."}</p>
    {status&&<p role="status" className="muted">{status}</p>}
    {issued?<div className="backup-preview panel panel-quiet stack">
      <code style={{overflowWrap:"anywhere",userSelect:"all"}}>{issued}</code>
      <p className="muted">Guárdalo fuera de Nexus Notes y de este chat. No lo compartas.</p>
      <button className="action action-quiet" onClick={download}>Descargar código</button>
    </div>:<form className="stack" onSubmit={submit}>
      {mode==="redeem"&&<label className="field">Código de emergencia<input required autoComplete="off" maxLength={100} value={code} onChange={e=>setCode(e.target.value)}/></label>}
      <label className="field">{mode==="generate"?"Contraseña actual":"Nueva contraseña"}<input required type="password" minLength={mode==="redeem"?12:1} maxLength={128} autoComplete={mode==="generate"?"current-password":"new-password"} value={password} onChange={e=>setPassword(e.target.value)}/></label>
      {mode==="redeem"&&<label className="field">Repetir nueva contraseña<input required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>}
      {error&&<p className="alert" role="alert">{error}</p>}
      <button className="action action-primary" disabled={busy}>{busy?"Procesando…":mode==="generate"?"Generar código de emergencia":"Restablecer contraseña"}</button>
    </form>}
  </section>;
}
