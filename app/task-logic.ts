export type Step = { id: string; title: string; done: boolean };
export type Recurrence = "none" | "daily" | "weekly" | "monthly";
export const recurrenceLabels:Record<Recurrence,string>={none:"No repetir",daily:"Diaria",weekly:"Semanal",monthly:"Mensual"};
export function validDay(day:string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(day)&&!Number.isNaN(Date.parse(day))&&new Date(day).toISOString().slice(0,10)===day;
}
export function nextOccurrence(day:string,frequency:Exclude<Recurrence,"none">,anchor=Number(day.slice(8))) {
  if(!validDay(day))throw new Error("Fecha inválida");
  if(frequency!=="monthly")return addDays(day,frequency==="daily"?1:7);
  const date=new Date(day+"T12:00:00Z");date.setUTCDate(1);date.setUTCMonth(date.getUTCMonth()+1);
  const last=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();
  date.setUTCDate(Math.min(Math.max(anchor,1),last));return date.toISOString().slice(0,10);
}
export function stepProgress(steps: Step[], manual: number) {
  return steps.length ? Math.round(100 * steps.filter(s => s.done).length / steps.length) : manual;
}
export function limaDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  return ["year", "month", "day"].map(key => parts.find(p => p.type === key)!.value).join("-");
}
export function addDays(day: string, days: number) {
  const date = new Date(day + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function dayGroup(task: { due: string; progress: number }, today: string) {
  if (task.progress === 100) return null;
  if (!task.due) return "Sin fecha";
  if (task.due < today) return "Atrasadas";
  if (task.due === today) return "Para hoy";
  if (task.due <= addDays(today, 7)) return "Próximos 7 días";
  return null;
}

export function taskReminders(tasks: { id?: string; title: string; due: string; progress: number; priority: "Alta" | "Media" | "Baja" }[], today: string) {
  const tomorrow = addDays(today, 1);
  return tasks.filter(t => t.id && t.progress < 100 && t.due && t.due <= tomorrow)
    .sort((a,b) => a.due.localeCompare(b.due) || ({Alta:0,Media:1,Baja:2}[a.priority] - {Alta:0,Media:1,Baja:2}[b.priority]))
    .map(t => {
      const timing = t.due < today ? `Vencida desde el ${t.due.split("-").reverse().join("/")}` : t.due === today ? "Vence hoy" : "Vence mañana";
      return { id: `${t.id}:${t.due}:${today}`, taskId: t.id!, text: `${t.title} — ${timing} · Prioridad ${t.priority.toLowerCase()} · Avance ${t.progress}%.`, tone: "info" as const };
    });
}
