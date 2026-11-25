import test from "node:test";
import assert from "node:assert/strict";
import { stepProgress, dayGroup, limaDate, addDays, taskReminders, nextOccurrence } from "../app/task-logic.ts";
test("checklists compute progress and preserve manual legacy progress", () => {
  assert.equal(stepProgress([],80),80);
  const steps = Array.from({length:4},(_,i)=>({id:String(i),title:"Paso",done:i<2}));
  assert.equal(stepProgress(steps,99),50);
  assert.equal(stepProgress(steps.map(s=>({...s,done:true})),0),100);
  assert.equal(stepProgress(steps.map(s=>({...s,done:false})),100),0);
});
test("today groups exclude completed work and include exact seven-day boundary", () => {
  const group=(due,progress=40)=>dayGroup({due,progress},"2026-10-20");
  assert.equal(group("2026-10-19"),"Atrasadas");
  assert.equal(group("2026-10-20"),"Para hoy");
  assert.equal(group("2026-10-21"),"Próximos 7 días");
  assert.equal(group("2026-10-27"),"Próximos 7 días");
  assert.equal(group("2026-10-28"),null);
  assert.equal(group(""),"Sin fecha");
  assert.equal(group("2026-10-19",100),null);
  assert.equal(group("",100),null);
});
test("Peru midnight and month/year rollover", () => {
  assert.equal(limaDate(new Date("2026-10-21T04:59:00Z")),"2026-10-20");
  assert.equal(limaDate(new Date("2026-10-21T05:00:00Z")),"2026-10-21");
  assert.equal(addDays("2026-12-29",7),"2027-01-05");
});

test("reminders identify actionable tasks and exclude completed, undated and distant work", () => {
  const task = {id:"camera",title:"Cámaras Porvenir",priority:"Alta",progress:80,due:"2026-10-22"};
  const notices = taskReminders([task, {...task,id:"done",progress:100}, {...task,id:"undated",due:""}, {...task,id:"later",due:"2026-10-23"}], "2026-10-21");
  assert.equal(notices.length,1);
  assert.equal(notices[0].taskId,"camera");
  assert.match(notices[0].text,/Cámaras Porvenir.*Vence mañana.*Prioridad alta.*80%/);
  assert.match(taskReminders([task],"2026-10-22")[0].text,/Vence hoy/);
  assert.match(taskReminders([task],"2026-10-23")[0].text,/Vencida desde el 22\/10\/2026/);
  assert.deepEqual(taskReminders([{...task,progress:100}],"2026-10-23"),[]);
  assert.equal(taskReminders([{...task,progress:90}],"2026-10-21")[0].id,notices[0].id);
});

test("recurrence handles leap years, month ends and anchored monthly dates",()=>{
 assert.equal(nextOccurrence("2026-12-31","daily"),"2027-01-01");
 assert.equal(nextOccurrence("2026-10-23","weekly"),"2026-10-30");
 assert.equal(nextOccurrence("2026-01-31","monthly",31),"2026-02-28");
 assert.equal(nextOccurrence("2026-02-28","monthly",31),"2026-03-31");
 assert.equal(nextOccurrence("2028-01-31","monthly",31),"2028-02-29");
 assert.throws(()=>nextOccurrence("2026-02-31","daily"));
});
