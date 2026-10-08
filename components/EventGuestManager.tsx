"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GuestStatus } from "@/lib/types";
import StatusPill from "@/components/StatusPill";
import { ROLE_STYLE, type RoleCode } from "@/lib/roles";

type Row={id:number;name:string;region:string|null;registered:boolean;status:GuestStatus|null;roles:RoleCode[]};

export default function EventGuestManager({eventId,rows}:{eventId:number;rows:Row[]}){
  const router=useRouter();
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState<number|string|null>(null);
  const ordered=[...rows].sort((a,b)=>Number(b.registered)-Number(a.registered)||a.name.localeCompare(b.name));

  async function changeRegistration(row:Row){
    setBusy(row.id); setMessage("");
    const res=await fetch(`/api/events/${eventId}/guests`,{method:row.registered?"DELETE":"POST",headers:{"content-type":"application/json"},body:JSON.stringify({guestId:row.id})});
    const data=await res.json();
    setMessage(res.ok?(row.registered?`Unregistered ${row.name}`:`Registered ${row.name}`):(data.error||"Could not update registration"));
    setBusy(null); if(res.ok) router.refresh();
  }

  async function checkIn(row:Row){
    setBusy(`checkin-${row.id}`); setMessage("");
    const res=await fetch(`/api/events/${eventId}/check-in`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({guestId:row.id})});
    const data=await res.json();
    setMessage(res.ok?`${row.name} checked in successfully.`:(data.error||"Could not check in guest"));
    setBusy(null); if(res.ok) router.refresh();
  }

  async function bulk(method:"POST"|"DELETE"){
    setBusy(method); setMessage("");
    const res=await fetch(`/api/events/${eventId}/guests`,{method,headers:{"content-type":"application/json"},body:JSON.stringify({all:true})});
    const data=await res.json();
    if(res.ok){
      setMessage(method==="POST"?`Registered ${data.registered} additional participant(s).`:`Unregistered ${data.unregistered} participant(s).${data.skipped?` ${data.skipped} with attendance history were kept.`:""}`);
      router.refresh();
    } else setMessage(data.error||"Could not update registrations");
    setBusy(null);
  }

  return <>
    <div className="card">
      <div className="actions" style={{justifyContent:"space-between"}}>
        <div className="actions"><button type="button" className="btn accent" disabled={busy!==null} onClick={()=>bulk("POST")}>Register all participants</button><button type="button" className="btn secondary" disabled={busy!==null} onClick={()=>bulk("DELETE")}>Unregister all participants</button></div>
        <span className="small muted">Participants with attendance history are protected from unregistration.</span>
      </div>
      {message&&<div className="notice good" style={{marginTop:12}}>{message}</div>}
    </div>
    <div style={{height:14}}/>
    <div className="table-wrap"><table><thead><tr><th>Guest</th><th>Region</th><th>Roles</th><th>Event status</th><th>Manual attendance</th><th>Registration</th></tr></thead><tbody>
      {ordered.map(row=><tr key={row.id}><td><strong>{row.name}</strong></td><td>{row.region||"—"}</td><td><div className="role-lines">{row.roles.map(role=><span key={role}>{ROLE_STYLE[role].label}</span>)}</div></td><td>{row.registered&&row.status?<StatusPill status={row.status}/>:<span className="muted">Not registered</span>}</td><td>{row.registered?(row.status==="INSIDE"?<button type="button" className="btn secondary" disabled>Checked in</button>:<button type="button" className="btn accent" disabled={busy===`checkin-${row.id}`||busy!==null&&busy!==`checkin-${row.id}`} onClick={()=>checkIn(row)}>{busy===`checkin-${row.id}`?"Checking in…":"Check in"}</button>):<span className="muted">—</span>}</td><td>{row.registered?<button type="button" className="btn danger icon-btn" title={`Unregister ${row.name}`} aria-label={`Unregister ${row.name}`} disabled={busy===row.id||busy!==null&&busy!==row.id} onClick={()=>changeRegistration(row)}>×</button>:<button type="button" className="btn accent" disabled={busy===row.id||busy!==null&&busy!==row.id} onClick={()=>changeRegistration(row)}>{busy===row.id?"Saving…":"Register"}</button>}</td></tr>)}
    </tbody></table></div>
    {!ordered.length&&<div className="card empty-state">No guests have been added yet.</div>}
  </>;
}
