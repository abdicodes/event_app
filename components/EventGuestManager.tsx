"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { GuestStatus } from "@/lib/types";
import StatusPill from "@/components/StatusPill";

type Row={id:number;name:string;delegation_wg:string|null;registered:boolean;status:GuestStatus|null};

export default function EventGuestManager({eventId,rows}:{eventId:number;rows:Row[]}){
  const router=useRouter();
  const [query,setQuery]=useState("");
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState<number|null>(null);
  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    const list=q?rows.filter(r=>[r.name,r.delegation_wg||""].some(v=>v.toLowerCase().includes(q))):rows;
    return [...list].sort((a,b)=>Number(b.registered)-Number(a.registered)||a.name.localeCompare(b.name));
  },[rows,query]);

  async function change(row:Row){
    setBusy(row.id); setMessage("");
    const res=await fetch(`/api/events/${eventId}/guests`,{method:row.registered?"DELETE":"POST",headers:{"content-type":"application/json"},body:JSON.stringify({guestId:row.id})});
    const data=await res.json();
    setMessage(res.ok?(row.registered?`Removed ${row.name} from this event`:`Registered ${row.name} for this event`):(data.error||"Could not update registration"));
    setBusy(null); if(res.ok) router.refresh();
  }

  return <>
    <div className="card"><div className="field"><label htmlFor="guest-search">Find guest</label><input id="guest-search" className="input" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by name or Delegation/WG"/></div>{message&&<div className="notice good" style={{marginTop:12}}>{message}</div>}</div>
    <div style={{height:14}}/>
    <div className="table-wrap"><table><thead><tr><th>Guest</th><th>Delegation/WG</th><th>Event status</th><th></th></tr></thead><tbody>
      {filtered.map(row=><tr key={row.id}><td><strong>{row.name}</strong></td><td>{row.delegation_wg||"—"}</td><td>{row.registered&&row.status?<StatusPill status={row.status}/>:<span className="muted">Not registered</span>}</td><td><button type="button" className={`btn ${row.registered?"secondary":"accent"}`} disabled={busy===row.id} onClick={()=>change(row)}>{busy===row.id?"Saving…":row.registered?"Unregister":"Register"}</button></td></tr>)}
    </tbody></table></div>
    {!filtered.length&&<div className="card empty-state">No matching guests.</div>}
  </>;
}
