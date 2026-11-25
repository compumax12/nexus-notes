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
  return <div className="nexus-overview bitacora">
    <section className="bitacora-siguiente" aria-label="Siguiente tarea">
      <div className="bitacora-label">Siguiente tarea</div>
      <h2 className="bitacora-titulo">{next?.title ?? (loading ? "Preparando tu espacio…" : "Dale lugar a tu próxima idea.")}</h2>
      <p className="bitacora-nota">{next?.steps.find(s=>!s.done)?.title ?? (next ? "Retoma esta tarea y registra lo que avanzaste." : "Crea una tarea, divídela en pasos y empieza a avanzar.")}</p>
      <div className="bitacora-meta">
        <span>{next ? `Prioridad ${next.priority}` : "Prioridad —"}</span>
        <span>{next?.due ? next.due.split("-").reverse().join("/") : "Sin fecha límite"}</span>
      </div>
      <button className="bitacora-continuar" aria-label={next ? `Continuar con ${next.title}` : "Ir a todas las tareas"} onClick={()=>next ? open(next) : navigate("Todas las tareas")}>Continuar</button>
      <div className="bitacora-pie-tarea">
        <span>{ordered.length} por completar</span>
        <span>{next ? (next.steps.length ? `${next.steps.filter(s=>s.done).length} / ${next.steps.length} pasos` : "Avance a tu ritmo") : "Todo comienza con una tarea"}</span>
      </div>
    </section>

    <section className="bitacora-estado" aria-label="Estado del trabajo">
      <span className="bitacora-label">Avance</span>
      <strong className="bitacora-porcentaje">{average}<small>%</small></strong>
      <div className="bitacora-linea" role="img" aria-label={`Avance promedio ${average}%`}><i style={{width:`${average}%`}}/></div>
      <p>{done} de {tasks.length} tareas terminadas</p>
      <div className="bitacora-contadores">
        {counters.map(({ label, value, view }) => <button className="bitacora-contador" key={label} onClick={()=>navigate(view)}>
          <span>{label}</span>
          <strong>{loading && !tasks.length ? "—" : value}</strong>
        </button>)}
      </div>
      <p className="bitacora-pie">Cada paso que completas cuenta.</p>
    </section>

    <section className="bitacora-frente" aria-label="Próximas tareas">
      <div className="bitacora-cabecera">
        <h2>Próximas tareas</h2>
        <span>{ordered.length}</span>
        <button className="bitacora-texto" onClick={()=>navigate("Por completar")}>Ver todas</button>
      </div>
      {ordered.slice(0,4).map((t,index) => <button className="bitacora-fila" key={t.id} onClick={()=>open(t)}>
        <span className="bitacora-orden">{String(index+1)}</span>
        <span className="bitacora-tarea">
          <strong>{t.title}</strong>
          <span>{t.priority}{t.due ? ` · ${t.due.split("-").reverse().join("/")}` : " · Sin fecha"}{t.shared ? " · Compartida" : ""}</span>
        </span>
        <span className="bitacora-avance">
          <b>{t.progress}%</b>
          <span className="bitacora-linea"><i style={{width:`${t.progress}%`}}/></span>
        </span>
      </button>)}
      {!ordered.length && <div className="bitacora-vacio">
        <CircleCheck size={32}/>
        <h3>{loading ? "Cargando…" : "Tienes el camino despejado"}</h3>
        <p>Las tareas abiertas aparecerán aquí, ordenadas por prioridad.</p>
      </div>}
      <p className="bitacora-nota-final"><Check size={14}/> Tus notas y pasos están dentro de cada tarea.</p>
    </section>

    <aside className="bitacora-panel" aria-label="Vencimientos y prioridades">
      <div className="bitacora-aviso">
        <CalendarDays size={21}/>
        <div>
          <span>Hoy y vencidas</span>
          <strong>{due ? `${due} ${due===1 ? "tarea necesita" : "tareas necesitan"} atención` : "Sin vencimientos pendientes"}</strong>
        </div>
        <button className="bitacora-texto" aria-label="Ver tareas de hoy" onClick={()=>navigate("Hoy")}>Ver hoy</button>
      </div>
      <div className="bitacora-prioridades">
        <div className="bitacora-cabecera">
          <h2>Por prioridad</h2>
          <span>Abiertas</span>
        </div>
        {(["Alta","Media","Baja"] as const).map(p => {
          const count = ordered.filter(t => t.priority === p).length;
          return <button className="bitacora-prioridad" key={p} onClick={()=>navigate("Por completar",p)}>
            <span>{p}</span>
            <span className="bitacora-linea"><i className={p.toLowerCase()} style={{width:`${ordered.length ? count/ordered.length*100 : 0}%`}}/></span>
            <b>{count}</b>
          </button>;
        })}
      </div>
    </aside>
  </div>;
}
