"use client";
import {useEffect,useState} from 'react';
type User={username:string;email:string;name:string;active:number;admin:number};
type Invitation={email:string;name:string;expires:number};
type Listing={admin:boolean;users?:User[];invitations?:Invitation[]};
export default function Users(){
 const [listing,setListing]=useState<Listing|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [name,setName]=useState(''),[email,setEmail]=useState(''),[code,setCode]=useState(''),[message,setMessage]=useState('');
 const [target,setTarget]=useState<User|null>(null);
 async function load(active=true){const r=await fetch('/api/users',{cache:'no-store'});if(!r.ok)throw new Error('No se pudieron cargar los usuarios. Vuelve a iniciar sesión.');const data=await r.json() as Listing;if(active)setListing(data);}
 useEffect(()=>{let active=true;queueMicrotask(()=>{if(!active)return;void load(active).catch(e=>{if(active)setError(e.message);});});return ()=>{active=false;};},[]);
 async function change(body:Record<string,string>){
  setBusy(true);setError('');setMessage('');setCode('');
  try{const r=await fetch('/api/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json() as {error?:string;code?:string};if(!r.ok)throw new Error(data.error||'No se pudo guardar.');
   if(data.code){setCode(data.code);setName('');setEmail('');}else setMessage('Cambio guardado.');
   setTarget(null);await load();
  }catch(e){setError(e instanceof Error?e.message:'No hay conexión.');}finally{setBusy(false);}
 }
 if(listing&&!listing.admin)return <p>Tu espacio es privado. Solicita al administrador una invitación para otra persona; después podrás compartir tareas o apuntes concretos.</p>;
 return <div className="local-users">
  {error&&<p role="alert" className="alert">{error}</p>}
  {!listing&&!error&&<p>Cargando usuarios…</p>}
  {!listing&&error&&<button className="secondary" onClick={()=>load().then(()=>setError('')).catch(e=>setError(e.message))}>Reintentar</button>}
  {listing?.admin&&<>
   <p>Administra el acceso sin acceder a los contenidos privados de otras personas.</p>
   <form onSubmit={e=>{e.preventDefault();void change({action:'invite',name,email});}}>
    <label>Nombre de la persona<input required maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label>
    <label>Correo electrónico<input required type="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}/></label>
    <button className="primary" disabled={busy}>{busy?'Guardando…':'Crear invitación'}</button>
   </form>
   <p>Válida durante 24 horas y un solo uso. Crear otra para el mismo correo anula la anterior. El destinatario elige su contraseña al entrar en “Tengo invitación”.</p>
   {code&&<div className="local-invitation" role="status"><strong>Entrega este código solo al destinatario</strong><p>No se envía ningún correo automáticamente. El código se muestra únicamente ahora.</p><textarea aria-label="Código de invitación" readOnly value={code} rows={3}/><button className="secondary" onClick={()=>setCode('')}>Ocultar código</button></div>}
   {message&&<p role="status">{message}</p>}
   <h3>Invitaciones pendientes</h3>
   {!listing.invitations?.length&&<p>No hay invitaciones pendientes.</p>}
   {listing.invitations?.map(i=><div className="local-user-row" key={i.email}><div><strong>{i.name}</strong><p>{i.email}</p><small>Vence: {new Date(i.expires).toLocaleString('es-PE')}</small></div><button className="secondary" disabled={busy} onClick={()=>void change({action:'revoke',email:i.email})}>Anular invitación</button></div>)}
   <h3>Cuentas</h3>
   {listing.users?.map(u=><div className="local-user-row" key={u.username}><div><strong>{u.name}</strong><p>{u.username} · {u.email}</p><small>{u.admin?'Administrador':u.active?'Activa':'Desactivada'}</small></div>{!u.admin&&<button className="secondary" disabled={busy} onClick={()=>u.active?setTarget(u):void change({action:'enable',username:u.username})}>{u.active?'Desactivar':'Reactivar'}</button>}</div>)}
   {target&&<div className="local-invitation" role="alert"><p>¿Desactivar a <strong>{target.name}</strong>? Se cerrarán sus sesiones. Sus tareas y apuntes se conservarán.</p><div className="selfhost-login-actions"><button className="primary" disabled={busy} onClick={()=>void change({action:'disable',username:target.username})}>Sí, desactivar</button><button className="secondary" disabled={busy} onClick={()=>setTarget(null)}>Cancelar</button></div></div>}
  </>}
 </div>;
}

