"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Plus, LayoutDashboard, ListTodo, CircleCheck, Search, Cloud, X, SlidersHorizontal, Monitor, CalendarDays, Check, RefreshCw, Bell, BookOpen, Layers, LockKeyhole, Settings as SettingsIcon, Users } from "lucide-react";
import { dayGroup, limaDate, stepProgress, taskReminders, recurrenceLabels, type Recurrence, type Step } from "./task-logic";
import LockScreen from "./lock-screen";
import Settings from "./settings";
import Overview from "./overview";
import Notes from "./notes";
import UnsavedChanges from "./unsaved-changes";
import ServiceAlerts from "./service-alerts";
import type { Note } from "./note-schema";
export type Task = { recurrence?:Recurrence; recurrenceDay?:number; recurrenceParent?:string|null; id?: string; title: string; notes: string; requester: string; priority: "Alta" | "Media" | "Baja"; due: string; progress: number; updatedAt?: string; steps: Step[]; sharedWith?: string[]; isOwner?: boolean; shared?: boolean };
type Notice = { id: string; text: string; tone: "info" | "success" | "error"; taskId?: string };
const empty: Task = { title: "", notes: "", requester: "", priority: "Media", recurrence:"none", due: "", progress: 0, steps: [] };
const status = (p: number) => p === 100 ? "Terminado" : p === 0 ? "Pendiente" : "En proceso";
export default function Dashboard({displayName,email}:{displayName:string;email:string}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [locked, setLocked] = useState(false);
  async function lockApp() {
    try {
      const response = await fetch("/api/lock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "lock" }) });
      if (!response.ok) throw new Error("No se pudo bloquear. Reintenta.");
      setTasks([]); setDraft(null); setLocked(true);
    } catch { fail("No se pudo bloquear la app. Comprueba la conexión y reintenta."); }
  }
  const [view, setView] = useState("Resumen");
  const [notices, setNotices] = useState<Notice[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const announcedIds = useRef(new Set<string>());
  const previousTasks = useRef<Task[] | null>(null);
  const refreshActive = useRef(true);
  const lastToast = useRef<{text:string;tone:Notice["tone"]}|null>(null);
  const notify = useCallback((text: string, tone: Notice["tone"] = "info") => {
    if (lastToast.current?.text === text && lastToast.current.tone === tone) return;
    lastToast.current = { text, tone };
    setNotices(old => [...old, { id: crypto.randomUUID(), text, tone }].slice(-3));
  }, [setNotices]);
  useEffect(() => {
    if (!notices.length) return;
    const timer = window.setTimeout(() => setNotices(old => old.slice(1)), notices[0].taskId ? 10000 : 4500);
    return () => window.clearTimeout(timer);
  }, [notices]);
  const [today, setToday] = useState(() => limaDate());
  const reminders = useMemo(() => taskReminders(tasks, today), [tasks, today]);
  const unread = reminders.filter(n => !readIds.includes(n.id)).length;
  useEffect(() => {
    const fresh = reminders.filter(n => !announcedIds.current.has(n.id));
    reminders.forEach(n => announcedIds.current.add(n.id));
    setNotices(old => [...old.flatMap(n => n.taskId ? reminders.filter(r => r.id === n.id) : [n]), ...fresh.slice(0, 2)].slice(-3));
  }, [reminders]);
  const [stepTitle, setStepTitle] = useState("");
  const [shareEmail, setShareEmail] = useState("");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("Todas");
  const [draft, setDraft] = useState<Task | null>(null);
  const [originalDraft,setOriginalDraft]=useState("");
  const [confirmDiscard,setConfirmDiscard]=useState(false);
  const dirty=!!draft&&(JSON.stringify(draft)!==originalDraft||!!stepTitle.trim()||!!shareEmail.trim());
  function closeTask(){if(saving)return;if(dirty){setConfirmDiscard(true);return;}setDraft(null);setError("");}
  useEffect(()=>{if(!dirty)return;const prevent=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue="";};window.addEventListener("beforeunload",prevent);return()=>window.removeEventListener("beforeunload",prevent);},[dirty]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  function success(text: string) { notify(text, "success"); }
  const fail = useCallback((text: string) => { if (refreshActive.current) { setError(text); notify(text, "error"); } }, [notify]);
  const [exporting, setExporting] = useState(false);
  async function exportBackup() {
    if (exporting) return;
    setExporting(true); setError("");
    try {
      const response = await fetch("/api/tasks", { cache: "no-store" });
      if (response.status === 423 || response.status === 401) { setTasks([]); setDraft(null); setLocked(true); return; }
      if (!response.ok) throw new Error("No se pudo obtener el respaldo. Revisa tu conexión y vuelve a intentarlo.");
      const savedTasks = await response.json() as Task[];
      if (!Array.isArray(savedTasks)) throw new Error("La respuesta no es válida. Vuelve a intentarlo.");
      const notesResponse=await fetch("/api/notes",{cache:"no-store"});
      if(notesResponse.status===401 || notesResponse.status===423){setTasks([]);setDraft(null);setLocked(true);return;}
      if(!notesResponse.ok)throw new Error("No se pudieron respaldar los apuntes. Reintenta para descargar el respaldo completo.");
      const savedNotes=await notesResponse.json() as Note[];
      if(!Array.isArray(savedNotes))throw new Error("La respuesta de apuntes no es válida.");
      const exportedAt = new Date().toISOString();
      const backup = { format: "mi-avance-backup", version: 2, exportedAt, taskCount: savedTasks.length, noteCount:savedNotes.length, notes:savedNotes,
        tasks: savedTasks.map(({ id, title, notes, requester, priority, due, progress, updatedAt, steps, sharedWith, isOwner, shared, recurrence, recurrenceDay }) =>
          ({ id, title, notes, requester, priority, due, progress, updatedAt, steps: steps ?? [], sharedWith, isOwner, shared, recurrence, recurrenceDay })) };
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url; link.download = `nexus-notes-respaldo-${exportedAt.replace(/[:.]/g, "-")}.json`;
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      success(`Respaldo preparado: ${savedTasks.length} tareas y ${savedNotes.length} apuntes guardados. Revisa tus descargas y conserva el archivo en un lugar seguro.`);
    } catch (e) { fail(e instanceof TypeError ? "No hay conexión. No se descargó el respaldo; vuelve a intentarlo." : e instanceof Error ? e.message : "No se pudo descargar el respaldo."); }
    finally { setExporting(false); }
  }
  const refresh=useCallback(async()=>{
    if (refreshActive.current) setLoading(true);
    try {
      const response = await fetch("/api/tasks", { cache: "no-store" });
      const data = await response.json();
      if (!refreshActive.current) return;
      if (response.status === 423 || response.status === 401) { if (refreshActive.current) { setTasks([]); setDraft(null); setLocked(true); } return; }
      if (!response.ok) throw new Error((data as { error: string }).error);
      const fresh = data as Task[];
      if (refreshActive.current) { previousTasks.current = fresh; setTasks(fresh); setError(""); }
    } catch (e) { fail(e instanceof TypeError ? "No se pudo conectar. Tus tareas visibles se conservan; pulsa Reintentar cuando tengas conexión." : e instanceof Error ? e.message : "No hay conexión. Intenta nuevamente."); }
    finally { if (refreshActive.current) setLoading(false); }
  },[fail]);
  useEffect(() => {
    let active=true;
    refreshActive.current=true;
    queueMicrotask(()=>{if(active&&refreshActive.current)void refresh();});
    const onFocus = () => { setToday(limaDate()); void refresh(); };
    const timer = window.setInterval(() => setToday(limaDate()), 60000);
    window.addEventListener("focus", onFocus);
    return () => { active=false; refreshActive.current=false; window.removeEventListener("focus", onFocus); window.clearInterval(timer); };
  }, [refresh]);
  useEffect(() => {
    if (!draft) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeTask(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [draft, saving, dirty]);
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!draft || saving) return;
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const data = await response.json() as Task & { error?: string; nextTask?:Task };
      if (response.status === 423) { setTasks([]); setDraft(null); setLocked(true); return; }
      if (!response.ok) throw new Error(data.error);
      const updated = [...(data.nextTask?[data.nextTask]:[]),data, ...(previousTasks.current ?? []).filter(t => t.id !== data.id)];
      previousTasks.current = updated;
      setTasks(updated);
      setDraft(null); success(`${draft.id ? "Tarea actualizada" : "Tarea creada"}: ${data.title} · ${data.progress}%. ${data.nextTask ? `Siguiente repetición creada para ${data.nextTask.due.split("-").reverse().join("/")}.` : "Cambios guardados."}`);
    } catch (e) { fail(e instanceof Error ? e.message : "No se pudo guardar. Reintenta."); }
    finally { setSaving(false); }
  }
  const pending = tasks.filter(t => t.progress === 0).length;
  const active = tasks.filter(t => t.progress > 0 && t.progress < 100).length;
  const done = tasks.filter(t => t.progress === 100).length;
  const average = tasks.length ? Math.round(tasks.reduce((a,t) => a + t.progress, 0) / tasks.length) : 0;
  const nextTask = tasks.filter(t=>t.progress<100).sort((a,b)=>({Alta:0,Media:1,Baja:2}[a.priority]-{Alta:0,Media:1,Baja:2}[b.priority]) || (a.due||"9999").localeCompare(b.due||"9999"))[0];
  const viewStatus = view === "Pendientes" ? "Pendiente" : view === "Terminados" ? "Terminado" : view === "En proceso" ? "En proceso" : null;
  const sectionTasks = tasks.filter(t => view === "Por completar" ? t.progress < 100 : !viewStatus || status(t.progress) === viewStatus);
  const visible = sectionTasks.filter(t => (priorityFilter === "Todas" || t.priority === priorityFilter) && `${t.title} ${t.requester} ${t.notes}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())).sort((a,b) => ({Alta:0,Media:1,Baja:2}[a.priority] - {Alta:0,Media:1,Baja:2}[b.priority]) || (a.due || "9999").localeCompare(b.due || "9999"));
  function open(task: Task) { setConfirmDiscard(false); setError(""); setStepTitle(""); setShareEmail(""); const copy={ ...task, steps: task.steps ?? [], sharedWith: task.sharedWith ?? [] }; setOriginalDraft(JSON.stringify(copy));setDraft(copy); }
  function openNotice(notice: Notice) {
    const task = tasks.find(t => t.id === notice.taskId);
    if (task) { open(task); setNotificationsOpen(false); setReadIds(old => [...old, notice.id]); }
    setNotices(old => old.filter(n => n.id !== notice.id));
  }
  function showTasks(next: string) { setView(next); setSearch(""); setPriorityFilter("Todas"); setNotificationsOpen(false); }
  function changeSteps(steps: Step[]) {
    if (draft) setDraft({ ...draft, steps, progress: stepProgress(steps, draft.progress) });
  }
  function addStep() {
    if (!stepTitle.trim() || !draft || draft.steps.length >= 50) return;
    changeSteps([...draft.steps, { id: crypto.randomUUID(), title: stepTitle.trim(), done: false }]);
    setStepTitle("");
  }
  const focusGroups = ["Atrasadas", "Para hoy", "Próximos 7 días", "Sin fecha"];
  const focused = tasks.filter(t => dayGroup(t, today) !== null);
  if (locked) return <LockScreen setup={false} />;
  return <div className="shell">
    <aside className="sidebar">
      <Link href="/" className="brand"><span className="brand-icon"><Layers size={23}/></span><span className="brand-word">NEXUS<small>Notas / espacio</small></span></Link>
      <div className="workspace"><span className="workspace-icon"><Monitor size={19}/></span><div>Mi espacio de trabajo<small>{displayName}</small></div></div>
      <p className="nav-label muted">Organización</p>
      <nav aria-label="Navegación principal">
        <button className={view === "Resumen" ? "nav-item selected" : "nav-item"} onClick={() => showTasks("Resumen")}><LayoutDashboard size={19}/> Resumen</button>
        <button className={view === "Hoy" ? "nav-item selected" : "nav-item"} onClick={() => showTasks("Hoy")}><CalendarDays size={19}/> Hoy <span>{tasks.filter(t => ["Atrasadas", "Para hoy"].includes(dayGroup(t, today) ?? "")).length}</span></button>
        <button className={view === "Todas las tareas" ? "nav-item selected" : "nav-item"} onClick={() => showTasks("Todas las tareas")}><ListTodo size={19}/> Todas las tareas <span>{tasks.length}</span></button>
        <button className={view === "Pendientes" ? "nav-item selected" : "nav-item"} onClick={() => showTasks("Pendientes")}><ListTodo size={19}/> Pendientes <span>{pending}</span></button>
        <button className={view === "En proceso" ? "nav-item selected" : "nav-item"} onClick={() => showTasks("En proceso")}><SlidersHorizontal size={19}/> En proceso <span>{active}</span></button>
        <button className={view === "Terminados" ? "nav-item selected" : "nav-item"} onClick={() => showTasks("Terminados")}><CircleCheck size={19}/> Terminados <span>{done}</span></button>
        <button className={view === "Apuntes" ? "nav-item selected" : "nav-item"} onClick={() => showTasks("Apuntes")}><BookOpen size={19}/> Apuntes</button>
      </nav>
      <div className="sidebar-tools"><p className="nav-label muted">Tu espacio</p>        <button className="nav-item" onClick={lockApp}><LockKeyhole size={18}/> Bloquear app</button>
        <button className={view === "Configuración" ? "nav-item selected" : "nav-item"} onClick={() => showTasks("Configuración")}><SettingsIcon size={19}/> Configuración</button>
</div>
      <div className="account"><span className="avatar">{displayName.slice(0,2).toUpperCase()}</span><div>{displayName}<small>Espacio personal · Privado</small></div></div>
    </aside>
    <main>
      <header className="topbar"><span>Mi espacio <span className="separator">/</span> <b>{view}</b></span><div className="topbar-actions"><span className="cloud"><Cloud size={16}/> {loading ? "Sincronizando…" : error ? "Revisar conexión" : "Sincronizado"}</span><button className="notification-bell" aria-label={`Notificaciones${unread ? `: ${unread} sin leer` : ""}`} aria-expanded={notificationsOpen} onClick={() => { setNotificationsOpen(!notificationsOpen); setReadIds(reminders.map(n => n.id)); }}><Bell size={20}/>{unread > 0 && <span>{unread}</span>}</button></div></header>
      {notificationsOpen && <section className="notification-panel" aria-label="Recordatorios de tareas"><div className="notification-title"><div><span className="notice-eyebrow">NEXUS · TU ACTIVIDAD</span><h2>Centro de avisos</h2></div><button aria-label="Cerrar notificaciones" onClick={() => setNotificationsOpen(false)}><X size={18}/></button></div><p>Tareas sin terminar que están vencidas o vencen hoy o mañana.</p>{!reminders.length && <p>No hay tareas que necesiten un recordatorio ahora.</p>}{reminders.map(n => <article key={n.id}><p>{n.text}</p>{n.taskId && <button onClick={() => openNotice(n)}>Abrir tarea</button>}</article>)}</section>}
      <div className="toast-stack" aria-live="polite" aria-relevant="additions">{notices.map(n => <div className={`toast toast-${n.tone}`} key={n.id}><span className="notice-orb">{n.tone === "success" ? <Check size={18}/> : n.tone === "error" ? <X size={18}/> : <Bell size={18}/>}</span><div><span className="notice-eyebrow">{n.taskId ? "NEXUS · RECORDATORIO" : n.tone === "success" ? "CAMBIOS GUARDADOS" : "REVISA ESTE AVISO"}</span><p>{n.text}</p>{n.taskId && <button onClick={() => openNotice(n)}>Abrir tarea</button>}</div><button className="toast-close" aria-label="Cerrar aviso" onClick={() => setNotices(old => old.filter(item => item.id !== n.id))}><X size={16}/></button></div>)}</div>
      <div className="content">
        <ServiceAlerts details={view === "Configuración"} onDetails={()=>showTasks("Configuración")}/>
        <div className="heading section-head"><div><div className="eyebrow">{new Date(today+"T12:00:00-05:00").toLocaleDateString("es-PE",{weekday:"long",day:"numeric",month:"long",timeZone:"America/Lima"})}</div><h1>{view === "Resumen" ? `Vamos a avanzar, ${displayName.split(" ")[0]}` : view}</h1><p>{view === "Resumen" ? "Aquí ves tus tareas y apuntes." : view === "Configuración" ? "Tu cuenta, tus respaldos y tu privacidad." : view === "Apuntes" ? "Tus ideas, soluciones y notas. Privadas, salvo que decidas compartirlas." : "Organiza tus próximos pasos y convierte pendientes en avances."}</p></div>{view !== "Apuntes" && view !== "Configuración" && <button className="primary action action-primary" onClick={() => open(empty)}><Plus size={18}/> Nueva tarea</button>}</div>
        {error && !draft && <div className="alert">{error} <button onClick={refresh}>Reintentar</button></div>}
        {view === "Apuntes" && <Notes email={email} onLocked={()=>{setTasks([]);setDraft(null);setLocked(true);}}/>}
        {view === "Configuración" && <Settings onImported={refresh} email={email} exportBackup={exportBackup} exporting={exporting} onLocked={() => {setTasks([]);setDraft(null);setLocked(true);}}/>}
        {view === "Hoy" && <section className="today-section stack" aria-label="Vista Hoy">
          <div className="section-title section-head"><div><h2>Hoy, un paso a la vez</h2><p>{new Date(today + "T12:00:00-05:00").toLocaleDateString("es-PE", { timeZone: "America/Lima", weekday: "long", day: "numeric", month: "long" })} · Hora de Perú</p></div><button type="button" className="secondary action action-quiet" onClick={() => showTasks("Todas las tareas")}>Ver todas las tareas</button></div>
          {loading && !tasks.length ? <p>Cargando tu día…</p> : error && !tasks.length ? <p>Reintenta la carga para ver tus pendientes.</p> : <div className="today-grid">{focusGroups.map(group => {
            const list = focused.filter(t => dayGroup(t, today) === group).sort((a,b) => ({Alta:0,Media:1,Baja:2}[a.priority] - {Alta:0,Media:1,Baja:2}[b.priority]) || a.due.localeCompare(b.due));
            return <article className={`day-panel panel ${group === "Atrasadas" ? "late" : ""}`} key={group}><h3>{group}<span>{list.length}</span></h3>
              {!list.length && <p className="day-empty">{group === "Para hoy" ? "No tienes vencimientos para hoy." : group === "Atrasadas" ? "Ninguna tarea atrasada." : group === "Sin fecha" ? "Todas tus tareas abiertas tienen fecha." : "Sin vencimientos en los próximos 7 días."}</p>}
              {list.map(t => <button type="button" className="day-task row" key={t.id} onClick={() => open(t)}><strong>{t.title}{t.recurrence&&t.recurrence!=="none"&&<span className="shared-badge">{recurrenceLabels[t.recurrence]}</span>}{t.shared && <span className="shared-badge">Compartida</span>}</strong><span>{t.due ? new Date(t.due + "T12:00:00").toLocaleDateString("es-PE", { day:"numeric",month:"short" }) : "Asigna una fecha para recordarla"} · {t.priority}</span><div className="day-progress"><span>{status(t.progress)}</span><b>{t.progress}%</b></div><div className="track"><i style={{width:`${t.progress}%`}}/></div>{!!t.steps?.length && <small>{t.steps.filter(s => s.done).length}/{t.steps.length} pasos · Siguiente: {t.steps.find(s => !s.done)?.title ?? "Todos completados"}</small>}</button>)}
            </article>;
          })}</div>}
          <p className="today-note">Aquí aparecen tareas sin terminar. Las que vencen después de 7 días están en Todas las tareas.</p>
        </section>}
        {view === "Resumen" && <Overview tasks={tasks} today={today} loading={loading} open={open} navigate={(next, priority)=>{showTasks(next);if(priority)setPriorityFilter(priority);}}/>}
        {["Todas las tareas", "Pendientes", "En proceso", "Terminados", "Por completar"].includes(view) && <>
        <section className="task-section"><div className="section-title section-head"><div><h2>{view} <span>{sectionTasks.length}</span></h2><p>{view === "Terminados" ? "Trabajos completados al 100%." : view === "Pendientes" ? "Tareas que aún no has comenzado." : view === "En proceso" ? "Trabajos que ya comenzaste y quedan por completar." : "Todos tus trabajos, de principio a fin."}</p></div><button className="refresh" onClick={refresh} disabled={loading} aria-label="Actualizar tareas"><RefreshCw size={17} className={loading ? "spin" : ""}/></button></div>
          <div className="toolbar"><label className="priority-filter">Prioridad<select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}><option value="Todas">Todas las prioridades</option><option>Alta</option><option>Media</option><option>Baja</option></select></label><label className="search"><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar en esta pestaña..." aria-label="Buscar en esta pestaña"/></label></div><p className="list-caption">{visible.length} de {sectionTasks.length} tareas · Prioridad alta primero; después, fecha límite.</p>
          {!loading && !visible.length ? <div className="empty"><span className="empty-icon"><ListTodo size={28}/></span><h3>{tasks.length ? "No hay tareas con este filtro" : "Todavía no hay tareas; crea la primera cuando quieras."}</h3><p>{tasks.length ? "Prueba otro estado o cambia tu búsqueda." : "Anota tu primer pendiente. Aquí podrás ver cuánto has avanzado y qué falta por hacer."}</p>{!tasks.length && <button className="primary action action-primary" onClick={() => open(empty)}><Plus size={17}/> Crear mi primera tarea</button>}</div> : <div className="task-list">{visible.map(t => <button className="task" key={t.id} onClick={() => open(t)}><span className={`task-icon ${t.progress === 100 ? "complete" : ""}`}>{t.progress === 100 ? <Check size={20}/> : <Monitor size={20}/>}</span><div className="task-name"><h3>{t.title}{t.recurrence&&t.recurrence!=="none"&&<span className="shared-badge">{recurrenceLabels[t.recurrence]}</span>}{t.shared && <span className="shared-badge">Compartida</span>}</h3><small>{t.requester || "Sin solicitante"} <span>·</span> <CalendarDays size={12}/>{t.due ? new Date(t.due + "T12:00:00").toLocaleDateString("es-PE", { day: "numeric", month: "short" }) : "Sin fecha"}{t.due && t.due < today && t.progress < 100 && <b className="overdue">Vencida</b>}</small><span className="action action-quiet task-open">Abrir</span></div><span className={`priority ${t.priority.toLowerCase()}`}>{t.priority}</span><div className="task-progress"><div><span>{status(t.progress)}</span><b>{t.progress}%</b></div><div className="track"><i style={{ width: `${t.progress}%` }}/></div></div></button>)}</div>}
          {loading && !tasks.length && <div className="empty">Cargando tus tareas…</div>}
        </section>
        <footer><span><Cloud size={14}/> Tus avances te acompañan en computadora y celular.</span><span>Tus avances quedan guardados en este dispositivo.</span></footer>
        </>}
      </div>
    </main>
    {draft && <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div className="modal-title"><div><div className="eyebrow">TU SIGUIENTE PASO</div><h2 id="dialog-title">{draft.id ? "Actualizar tarea" : "Nueva tarea"}</h2></div><button type="button" onClick={closeTask} aria-label="Cerrar" disabled={saving}><X/></button></div>{confirmDiscard&&<UnsavedChanges onKeep={()=>setConfirmDiscard(false)} onDiscard={()=>{setConfirmDiscard(false);setDraft(null);setError("");}}/>}<form onSubmit={save}>
      <label>¿Qué necesitas hacer?<input autoFocus required maxLength={160} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} placeholder="Ej. Configurar la impresora de Contabilidad"/></label>
      <div className="form-grid"><label>Solicitante o equipo<input maxLength={120} value={draft.requester} onChange={e => setDraft({ ...draft, requester: e.target.value })} placeholder="Ej. Ana · PC-04"/></label><label>Fecha límite<input type="date" required={!!draft.recurrence&&draft.recurrence!=="none"} value={draft.due} onChange={e => setDraft({ ...draft, due: e.target.value })}/></label></div>
      <div className="form-grid"><label>Prioridad<select value={draft.priority} onChange={e => setDraft({ ...draft, priority: e.target.value as Task["priority"] })}><option>Alta</option><option>Media</option><option>Baja</option></select></label><label>Estado<select disabled={draft.steps.length > 0} value={status(draft.progress)} onChange={e => setDraft({ ...draft, progress: e.target.value === "Pendiente" ? 0 : e.target.value === "Terminado" ? 100 : 10 })}><option>Pendiente</option><option>En proceso</option><option>Terminado</option></select></label></div>
      <section className="sharing-editor"><label>Repetición<select disabled={draft.isOwner===false} value={draft.recurrence??"none"} onChange={e=>setDraft({...draft,recurrence:e.target.value as Recurrence})}>{Object.entries(recurrenceLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><p>{draft.recurrence&&draft.recurrence!=="none" ? "Al completar y guardar, se crea una siguiente tarea con fecha basada en este vencimiento, avance en 0 y pasos desmarcados. Conserva el título, solicitante, prioridad y permisos; las notas quedan en la tarea terminada. Si estás atrasado, la siguiente también puede estar vencida." : "Activa una frecuencia para trabajos que necesitas repetir."}</p>{draft.isOwner===false&&<p>Solo su creador puede cambiar la frecuencia.</p>}</section>
      <section className="steps-editor" aria-label="Pasos de la tarea"><h3>Pasos de la tarea <span>{draft.steps.filter(s => s.done).length}/{draft.steps.length}</span></h3><p>{draft.steps.length ? "Cada paso vale lo mismo. Marca lo completado y guarda la tarea." : "Opcional: al añadir pasos, el porcentaje se calculará según los que completes."}</p>
        {draft.steps.map((step,index) => <div className="step-row" key={step.id}><input type="checkbox" aria-label={`Completar: ${step.title}`} checked={step.done} onChange={e => changeSteps(draft.steps.map(s => s.id === step.id ? {...s,done:e.target.checked} : s))}/><input type="text" aria-label={`Nombre del paso ${index+1}`} required maxLength={200} value={step.title} onChange={e => changeSteps(draft.steps.map(s => s.id === step.id ? {...s,title:e.target.value} : s))}/><button type="button" aria-label={`Quitar paso ${index+1}`} onClick={() => changeSteps(draft.steps.filter(s => s.id !== step.id))}><X size={16}/></button></div>)}
        <div className="add-step"><input aria-label="Nuevo paso" placeholder="Ej. Revisar conexión de la cámara" maxLength={200} value={stepTitle} onChange={e => setStepTitle(e.target.value)} onKeyDown={e => { if(e.key === "Enter"){e.preventDefault();addStep();} }}/><button type="button" className="secondary action action-quiet" disabled={!stepTitle.trim() || draft.steps.length >= 50} onClick={addStep}><Plus size={15}/> Añadir paso</button></div>
      </section>
      <div className="progress-editor"><label htmlFor="progress">Avance {draft.steps.length ? "automático" : "del trabajo"} <strong>{draft.progress}%</strong></label><input id="progress" disabled={draft.steps.length > 0} type="range" min="0" max="100" step="1" value={draft.progress} onChange={e => setDraft({ ...draft, progress: Number(e.target.value) })}/><div><span>0 % · Pendiente</span><span>100 % · Terminado</span></div></div>
      <label>Notas y solución<textarea rows={4} maxLength={5000} value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} placeholder="¿Qué hiciste? ¿Cuál es el siguiente paso?"/></label>
      <section className="sharing-editor" aria-label="Privacidad de la tarea"><h3><Users size={17}/> Privacidad y colaboración</h3>
        {draft.isOwner === false ? <p>Te compartieron esta tarea. Puedes actualizar sus pasos, avance y notas. Solo su creador puede cambiar quién tiene acceso.</p> : <>
          <p>{draft.sharedWith?.length ? "Compartida: estas personas podrán ver y editar la tarea, incluidos sus pasos y notas." : (draft.id ? "Privada: solo tú puedes ver esta tarea y sus notas." : "Al guardar se añadirán los destinatarios de Compartir automáticamente, si lo activaste en Configuración. Si no, será privada.")}</p>
          {(draft.sharedWith ?? []).map(address => <div className="share-person" key={address}><span>{address}</span><button type="button" onClick={() => setDraft({...draft,sharedWith:draft.sharedWith!.filter(item=>item!==address)})}>Quitar acceso</button></div>)}
          <div className="add-step"><input type="email" aria-label="Correo de la persona" placeholder="Correo de ChatGPT de la persona" value={shareEmail} onChange={e=>setShareEmail(e.target.value)} maxLength={254}/><button type="button" className="secondary action action-quiet" disabled={!shareEmail.trim() || (draft.sharedWith?.length ?? 0) >= 20} onClick={() => {const address=shareEmail.trim().toLowerCase(); if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)){fail("Escribe un correo válido.");return;} if(address===email.toLowerCase()){fail("Esta tarea ya te pertenece.");return;} setDraft({...draft,sharedWith:[...new Set([...(draft.sharedWith ?? []),address])]});setShareEmail("");setError("");}}>Añadir persona</button></div>
          <p>Los permisos se aplican al guardar. La persona también debe tener acceso a Nexus Notes desde Sites. Quitar el acceso no elimina copias que haya descargado antes.</p>
        </>}
      </section>
      {error && <div className="alert" role="alert">{error}</div>}
      <div className="form-footer"><button className="secondary action action-quiet" type="button" disabled={saving} onClick={closeTask}>Cancelar</button><button className="primary action action-primary" type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar tarea"}<Check size={17}/></button></div>
    </form></section></div>}
  </div>;
}
