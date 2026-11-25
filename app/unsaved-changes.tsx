"use client";
export default function UnsavedChanges({onKeep,onDiscard}:{onKeep:()=>void;onDiscard:()=>void}){
  return <div className="panel unsaved-changes stack" role="alert">
    <div className="section-head section-title"><strong>Tienes cambios sin guardar</strong></div>
    <p className="muted">Puedes seguir editando o cerrar sin guardar estos cambios.</p>
    <div className="split">
      <button type="button" className="action action-primary" autoFocus onClick={onKeep}>Seguir editando</button>
      <button type="button" className="action action-quiet" onClick={onDiscard}>Descartar cambios</button>
    </div>
  </div>;
}
