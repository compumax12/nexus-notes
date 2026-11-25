"use client";
export default function UnsavedChanges({onKeep,onDiscard}:{onKeep:()=>void;onDiscard:()=>void}){
 return <div className="unsaved-changes" role="alert">
  <strong>Tienes cambios sin guardar</strong>
  <p>Puedes seguir editando o cerrar sin guardar estos cambios.</p>
  <div><button type="button" className="primary" autoFocus onClick={onKeep}>Seguir editando</button><button type="button" className="secondary" onClick={onDiscard}>Descartar cambios</button></div>
 </div>;
}
