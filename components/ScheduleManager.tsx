"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Item={id:number;day:string;start_time:string;end_time:string|null;title:string;description:string|null;location:string|null};
const empty={day:"",startTime:"",endTime:"",title:"",description:"",location:""};

export default function ScheduleManager({items}:{items:Item[]}){
  const router=useRouter();
  const [editing,setEditing]=useState<number|null>(null);
  const [form,setForm]=useState(empty);
  const [message,setMessage]=useState("");
  const grouped=useMemo(()=>Object.entries(items.reduce<Record<string,Item[]>>((a,i)=>{(a[i.day]??=[]).push(i);return a;},{})).sort(([a],[b])=>a.localeCompare(b)),[items]);

  function startEdit(item:Item){ setEditing(item.id); setForm({day:item.day,startTime:item.start_time.slice(0,5),endTime:item.end_time?.slice(0,5)||"",title:item.title,description:item.description||"",location:item.location||""}); window.scrollTo({top:0,behavior:"smooth"}); }
  function reset(){setEditing(null);setForm(empty);}
  async function save(e:FormEvent){
    e.preventDefault();setMessage("");
    const url=editing?`/api/schedule/${editing}`:"/api/schedule";
    const res=await fetch(url,{method:editing?"PUT":"POST",headers:{"content-type":"application/json"},body:JSON.stringify(form)});
    const data=await res.json();
    setMessage(res.ok?(editing?"Schedule item updated":"Schedule item created"):(data.error||"Could not save schedule item"));
    if(res.ok){reset();router.refresh();}
  }
  async function remove(id:number){
    if(!confirm("Delete this schedule item?")) return;
    const res=await fetch(`/api/schedule/${id}`,{method:"DELETE"});
    const data=await res.json(); setMessage(res.ok?"Schedule item deleted":data.error||"Could not delete item"); if(res.ok) router.refresh();
  }
  return <>
    <form className="card" onSubmit={save}>
      <div className="page-head compact"><div><h2>{editing?"Edit programme item":"Add programme item"}</h2><p>Items are grouped by day and displayed chronologically to guests.</p></div>{editing&&<button type="button" className="btn secondary" onClick={reset}>Cancel edit</button>}</div>
      <div className="form-row">
        <div className="field"><label>Date</label><input className="input" type="date" required value={form.day} onChange={e=>setForm({...form,day:e.target.value})}/></div>
        <div className="field"><label>Start</label><input className="input" type="time" required value={form.startTime} onChange={e=>setForm({...form,startTime:e.target.value})}/></div>
        <div className="field"><label>End (optional)</label><input className="input" type="time" value={form.endTime} onChange={e=>setForm({...form,endTime:e.target.value})}/></div>
      </div>
      <div style={{height:12}}/>
      <div className="field"><label>Programme / activity</label><input className="input" maxLength={160} required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></div>
      <div style={{height:12}}/>
      <div className="grid two"><div className="field"><label>Location (optional)</label><input className="input" maxLength={160} value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/></div><div className="field"><label>Description (optional)</label><input className="input" maxLength={500} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div></div>
      <div className="actions" style={{marginTop:14}}><button className="btn accent">{editing?"Save changes":"Add to schedule"}</button></div>
      {message&&<div className={`notice ${message.includes("Could not")?"bad":"good"}`} style={{marginTop:12}}>{message}</div>}
    </form>
    <div style={{height:18}}/>
    <div className="schedule-admin-list">
      {grouped.map(([day,list])=><section className="card" key={day}><h2>{new Intl.DateTimeFormat(undefined,{dateStyle:"full",timeZone:"UTC"}).format(new Date(`${day}T00:00:00Z`))}</h2>{list.map(item=><div className="schedule-admin-row" key={item.id}><div className="schedule-admin-time">{item.start_time.slice(0,5)}{item.end_time?`–${item.end_time.slice(0,5)}`:""}</div><div><strong>{item.title}</strong><div className="small muted">{[item.location,item.description].filter(Boolean).join(" · ")||"No extra details"}</div></div><div className="actions"><button type="button" className="btn secondary" onClick={()=>startEdit(item)}>Edit</button><button type="button" className="btn danger" onClick={()=>remove(item.id)}>Delete</button></div></div>)}</section>)}
      {!items.length&&<div className="card empty-state">No schedule items yet.</div>}
    </div>
  </>;
}
