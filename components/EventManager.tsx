"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function EventManager(){
  const router=useRouter();
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    setBusy(true); setMessage("");
    const form=e.currentTarget;
    const fd=new FormData(form);
    const startsRaw=String(fd.get("startsAt")||"");
    const endsRaw=String(fd.get("endsAt")||"");
    const startsDate=startsRaw?new Date(startsRaw):null;
    const endsDate=endsRaw?new Date(endsRaw):null;
    if((startsDate&&Number.isNaN(startsDate.getTime()))||(endsDate&&Number.isNaN(endsDate.getTime()))){
      setMessage("Please enter valid event dates"); setBusy(false); return;
    }
    const payload={
      name:String(fd.get("name")||""),
      startsAt:startsDate?startsDate.toISOString():null,
      endsAt:endsDate?endsDate.toISOString():null,
    };
    const res=await fetch("/api/events",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
    const data=await res.json();
    setMessage(res.ok?`Created ${data.event.name}`:data.error||"Could not create event");
    setBusy(false);
    if(res.ok){form.reset();router.refresh();}
  }

  return <form className="card" onSubmit={submit}>
    <h2>Create event</h2>
    <div className="form-row">
      <div className="field"><label>Name</label><input className="input" name="name" required minLength={2} maxLength={140} placeholder="Autumn Conference"/></div>
      <div className="field"><label>Starts (optional)</label><input className="input" name="startsAt" type="datetime-local"/></div>
      <div className="field"><label>Ends (optional)</label><input className="input" name="endsAt" type="datetime-local"/></div>
    </div>
    <div className="actions" style={{marginTop:14}}><button className="btn accent" disabled={busy}>{busy?"Creating…":"Create event"}</button></div>
    {message && <div className={`notice ${message.startsWith("Created")?"good":"bad"}`} style={{marginTop:12}}>{message}</div>}
  </form>;
}
