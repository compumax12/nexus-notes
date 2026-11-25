import { CalendarDays, Check, CircleCheck } from "lucide-react";
import type { Task } from "./dashboard";

export default function Overview({ tasks, today, loading, open, navigate }: { tasks: Task[]; today: string; loading: boolean; open: (task: Task) => void; navigate: (view: string, priority?: string) => void }) {
  const ordered = tasks.filter(t => t.progress < 100).sort((a,b) => ({Alta:0,Media:1,Baja:2}[a.priority]-{Alta:0,Media:1,Baja:2}[b.priority]) || (a.due||"9999").localeCompare(b.due||"9999"));
  const done = tasks.filter(t => t.progress === 100).length;
  const active = tasks.filter(t => t.progress > 0 && t.progress < 100).length;
  const pending = tasks.filter(t => t.progress === 0).length;
  const average = tasks.length ? Math.round(tasks.reduce((sum,t)=>sum+t.progress,0)/tasks.length) : 0;
  const next = ordered[0];
  const due = ordered.filter(t=>t.due && t.due<=today).length;
  const counters = [
    { label: "Todas las tareas", value: tasks.length, view: "Todas las tareas" },
    { label: "Pendientes", value: pending, view: "Pendientes" },
    { label: "En proceso", value: active, view: "En proceso" },
    { label: "Terminados", value: done, view: "Terminados" },
  ];
  return <div className="nexus-overview stack">
    <section className="panel panel-strong overview-next" aria-label="Siguiente tarea">
      <div className="section-head section-title">
        <span className="muted">Siguiente tarea</span>
        {next && <span className={`tag tag-${next.priority.toLowerCase()}`}>{next.priority}</span>}
      </div>
      <h2 className="overview-next-title" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px,3.2vw,42px)", lineHeight: 1.08 }}>
        {next?.title ?? (loading ? "Preparando tu espacio…" : "No hay tareas abiertas ahora.")}
      </h2>
      <p className="muted">{next?.steps.find(s=>!s.done)?.title ?? (next ? "Retoma esta tarea y registra lo que avanzaste." : "Crea una tarea, divídela en pasos y empieza a avanzar.")}</p>
      <div className="row-meta">
        <span>{next ? `Prioridad ${next.priority}` : "Sin prioridad"}</span>
        <span>{next?.due ? next.due.split("-").reverse().join("/") : "Sin fecha límite"}</span>
      </div>
      {next && <div className="meter" role="img" aria-label={`Avance de ${next.title}: ${next.progress}%`}><i style={{width:`${next.progress}%`}}/></div>}
      <button className="action action-primary" aria-label={next ? `Continuar con ${next.title}` : "Ir a todas las tareas"} onClick={()=>next ? open(next) : navigate("Todas las tareas")}>Continuar</button>
      <div className="row-meta overview-next-foot">
        <span>{ordered.length} por completar</span>
        <span>{next ? (next.steps.length ? `${next.steps.filter(s=>s.done).length} / ${next.steps.length} pasos` : "Sin pasos registrados") : "Crea una tarea para empezar"}</span>
      </div>
    </section>

    <div className="split overview-middle">
      <section className="panel overview-progress" aria-label="Estado del trabajo">
        <div className="section-head section-title">
          <h2>Avance</h2>
          <strong className="accent">{average}<small>%</small></strong>
        </div>
        <div className="meter" role="img" aria-label={`Avance promedio ${average}%`}><i style={{width:`${average}%`}}/></div>
        <p className="muted">{done} de {tasks.length} tareas terminadas</p>
        <div className="rows">
          {counters.map(({ label, value, view }) => <button className="row" key={label} onClick={()=>navigate(view)}>
            <span className="row-title">{label}</span>
            <strong>{loading && !tasks.length ? "Cargando…" : value}</strong>
          </button>)}
        </div>
        <p className="muted">El promedio incluye todas las tareas.</p>
      </section>

      <aside className="panel panel-quiet overview-side" aria-label="Vencimientos y prioridades">
        <div className="row overview-due">
          <CalendarDays size={21}/>
          <div className="stack">
            <span className="muted">Hoy y vencidas</span>
            <strong>{due ? `${due} ${due===1 ? "tarea necesita" : "tareas necesitan"} atención` : "Sin vencimientos pendientes"}</strong>
          </div>
          <button className="action action-quiet" aria-label="Ver tareas de hoy" onClick={()=>navigate("Hoy")}>Ver hoy</button>
        </div>
        <div className="overview-priorities">
          <div className="section-head section-title">
            <h2>Por prioridad</h2>
            <span className="muted">Abiertas</span>
          </div>
          <div className="rows">
            {(["Alta","Media","Baja"] as const).map(p => {
              const count = ordered.filter(t => t.priority === p).length;
              return <button className="row" key={p} onClick={()=>navigate("Por completar",p)}>
                <span className={`tag tag-${p.toLowerCase()}`}>{p}</span>
                <div className="meter" role="img" aria-label={`Prioridad ${p}: ${count} de ${ordered.length} tareas abiertas`}><i style={{width:`${ordered.length ? count/ordered.length*100 : 0}%`}}/></div>
                <b>{count}</b>
              </button>;
            })}
          </div>
        </div>
      </aside>
    </div>

    <section className="panel overview-upcoming" aria-label="Próximas tareas">
      <div className="section-head section-title">
        <h2>Próximas tareas</h2>
        <span className="muted">{ordered.length}</span>
        <button className="action action-quiet" onClick={()=>navigate("Por completar")}>Ver todas</button>
      </div>
      <div className="rows">
        {ordered.slice(0,4).map(t => <button className="row overview-task" key={t.id} onClick={()=>open(t)}>
          <span className={`tag tag-${t.priority.toLowerCase()}`}>{t.priority}</span>
          <span className="row-title">
            <strong>{t.title}</strong>
            <span className="row-meta">{t.priority}{t.due ? ` · ${t.due.split("-").reverse().join("/")}` : " · Sin fecha"}{t.shared ? " · Compartida" : ""}</span>
          </span>
          <span className="overview-task-progress">
            <b>{t.progress}%</b>
            <div className="meter" role="img" aria-label={`Avance de ${t.title}: ${t.progress}%`}><i style={{width:`${t.progress}%`}}/></div>
          </span>
        </button>)}
      </div>
      {!ordered.length && <div className="stack overview-empty">
        <CircleCheck size={32}/>
        <h3>{loading ? "Cargando…" : "No hay tareas abiertas ahora"}</h3>
        <p className="muted">Las tareas abiertas aparecerán aquí, ordenadas por prioridad.</p>
      </div>}
      <p className="row-meta"><Check size={14}/> Tus notas y pasos están dentro de cada tarea.</p>
    </section>
  </div>;
}
