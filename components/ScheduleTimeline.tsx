"use client";

import { useMemo, useState } from "react";

type Item={id:number;day:string;start_time:string;end_time:string|null;title:string;description:string|null;location:string|null};
export default function ScheduleTimeline({items}:{items:Item[]}){
  const days=useMemo(()=>[...new Set(items.map(i=>i.day))].sort(),[items]);
  const now=new Date();
  const today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  const initial=Math.max(0,days.findIndex(d=>d>=today));
  const [index,setIndex]=useState(initial<0?0:initial);
  const day=days[index];
  const visible=items.filter(i=>i.day===day);
  if(!days.length) return <div className="public-card empty-state">The programme has not been published yet.</div>;
  const label=new Intl.DateTimeFormat(undefined,{weekday:"long",month:"long",day:"numeric",year:"numeric",timeZone:"UTC"}).format(new Date(`${day}T00:00:00Z`));
  return <>
    <div className="day-switcher" aria-label="Schedule day controls"><button className="public-btn secondary" type="button" disabled={index===0} onClick={()=>setIndex(i=>Math.max(0,i-1))}>← Previous day</button><div><span className="small muted">Programme</span><strong>{label}</strong></div><button className="public-btn secondary" type="button" disabled={index===days.length-1} onClick={()=>setIndex(i=>Math.min(days.length-1,i+1))}>Next day →</button></div>
    <div className="timeline">{visible.map(item=><article className="timeline-item" key={item.id}><div className="timeline-time">{item.start_time.slice(0,5)}{item.end_time&&<span>{item.end_time.slice(0,5)}</span>}</div><div className="timeline-dot"/><div className="timeline-card"><h2>{item.title}</h2>{item.location&&<div className="timeline-location">{item.location}</div>}{item.description&&<p>{item.description}</p>}</div></article>)}</div>
  </>;
}
