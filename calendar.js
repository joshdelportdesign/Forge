import {days,resources,dateInZone,EXAM,ZONE} from './data.js';

export const defaultPreferences={start:'08:00',end:'21:00',times:['09:00','13:00','18:00'],weekdays:[0,1,2,3,4,5,6],buffer:10};
export const kinds=['Learn','Practice','Reflect'];
export function localInstant(date,time){return new Date(`${date}T${time}:00+02:00`);}
export function timeLabel(date){return new Intl.DateTimeFormat('en-ZA',{timeZone:ZONE,hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(date));}
export function sessionTitle(day,i){return day.date==='2026-11-17'?['Segment 1 mock','Segment 2 mock','Segment 3 mock'][i]:`${kinds[i]}: ${day.title}`;}
export function sessionDescription(day,i){
  const r=resources[day.resource];
  const task=i===0?day.lesson:i===1?day.steps.join('\n\n'):`Record your elapsed time, what worked and one error to revisit.\n\nProof: ${day.proof}\n\nRecall: ${day.recall[0]}`;
  const mock=day.date==='2026-11-17'?day.steps[i]:task;
  return `${day.phase} · Day ${day.index+1}\n${day.focus}\n\n${mock}\n\nExercise: ${day.problems}\n${r.title}: ${r.url}\nTool help: ${resources.help.url}\n\nIndependent practice. Self-assess in SOLIDWORKS; FORGE cannot inspect CAD files.`;
}

// All scheduling uses Africa/Johannesburg (UTC+02). Busy intervals come from EventKit, which expands recurrences.
export function buildSchedule(preferences=defaultPreferences,busy=[],completed={},now=new Date()){
  const sessions=[],unscheduled=[];
  const today=dateInZone(now);
  const occupied=busy.filter(e=>!e.forge).map(e=>({start:new Date(e.start).getTime(),end:new Date(e.end).getTime()})).filter(e=>Number.isFinite(e.start)&&e.end>e.start);
  for(const day of days){
    if(day.date<today||day.date===EXAM)continue;
    const weekday=new Date(day.date+'T12:00:00Z').getUTCDay();
    let previousEnd=0;
    for(let i=0;i<3;i++){
      const id=`${day.date}-${i}`;
      if(completed[id])continue;
      const duration=day.minutes[i]*60000;
      let earliest=localInstant(day.date,preferences.start).getTime();
      if(day.date===today)earliest=Math.max(earliest,Math.ceil(now.getTime()/300000)*300000);
      earliest=Math.max(earliest,previousEnd);
      const latest=localInstant(day.date,preferences.end).getTime();
      if(!preferences.weekdays.includes(weekday)){unscheduled.push({id,day,i,reason:'This weekday is excluded in your availability.'});continue;}
      const fits=t=>t>=earliest&&t+duration<=latest&&!occupied.some(e=>t<e.end&&t+duration>e.start);
      const preferred=Math.max(earliest,localInstant(day.date,preferences.times[i]).getTime());
      let found=null;
      // Prefer the chosen anchor; if no time remains there, search the earlier part of the available window.
      for(const [a,b] of [[preferred,latest],[earliest,Math.min(preferred,latest)]]){
        for(let t=Math.ceil(a/300000)*300000;t+duration<=b;t+=300000){if(fits(t)){found=t;break;}}
        if(found!==null)break;
      }
      if(found===null){unscheduled.push({id,day,i,reason:`No ${day.minutes[i]}-minute gap in your available window.`});continue;}
      const end=found+duration;
      sessions.push({id,date:day.date,start:new Date(found).toISOString(),end:new Date(end).toISOString(),title:sessionTitle(day,i),description:sessionDescription(day,i),minutes:day.minutes[i],dayIndex:day.index,kind:i});
      const buffer=preferences.buffer*60000;
      occupied.push({start:found-buffer,end:end+buffer});
      previousEnd=end+buffer;
    }
  }
  return {sessions,unscheduled};
}

function escapeICS(value){return String(value).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');}
function stamp(value){return new Date(value).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z/,'Z');}
function fold(line){let output='',bytes=0;for(const char of line){const len=new TextEncoder().encode(char).length;if(bytes+len>75){output+='\r\n ';bytes=1;}output+=char;bytes+=len;}return output;}
export function makeICS(sessions,now=new Date()){
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//FORGE//CSWP Companion//EN','CALSCALE:GREGORIAN','X-WR-CALNAME:FORGE — CSWP study','X-WR-TIMEZONE:Africa/Johannesburg'];
  for(const s of sessions){lines.push('BEGIN:VEVENT',`UID:forge-cswp-${s.id}@local.study`,`DTSTAMP:${stamp(now)}`,`DTSTART:${stamp(s.start)}`,`DTEND:${stamp(s.end)}`,`SUMMARY:${escapeICS('CSWP · '+s.title)}`,`DESCRIPTION:${escapeICS(s.description)}`,'STATUS:CONFIRMED','TRANSP:OPAQUE','BEGIN:VALARM','TRIGGER:-PT10M','ACTION:DISPLAY','DESCRIPTION:Your CSWP study session starts in 10 minutes.','END:VALARM','END:VEVENT');}
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n')+'\r\n';
}
