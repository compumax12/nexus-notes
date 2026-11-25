export type BackupState={kind:"ok"|"missing"|"stale"|"unknown";day?:string};
// Compare calendar days in Lima; yesterday is allowed because copies run daily.
export function backupState(value:unknown,today:string):BackupState{
 if(!Array.isArray(value))return {kind:"unknown"};
 if(!value.length)return {kind:"missing"};
 const days=value.map(x=>x&&typeof x==='object'&&'day' in x?x.day:null);
 const valid=(day:unknown):day is string=>typeof day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(day)&&!Number.isNaN(Date.parse(day+'T00:00:00Z'))&&new Date(day+'T00:00:00Z').toISOString().slice(0,10)===day;
 if(!valid(today)||days.some(day=>!valid(day)||day>today))return {kind:"unknown"};
 const latest=(days as string[]).sort().at(-1)!;
 return {kind:(Date.parse(today+'T00:00:00Z')-Date.parse(latest+'T00:00:00Z'))/86400000>=2?'stale':'ok',day:latest};
}
