"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ROLE_STYLE, type RoleCode } from "@/lib/roles";
type Row={id:number;name:string;region:string|null;registered:boolean;has_voted:boolean;roles:RoleCode[]};

export default function PollParticipantManager({pollId,rows}:{pollId:number;rows:Row[]}){
  const router=useRouter();
  const [msg,setMsg]=useState("");
  const [busy,setBusy]=useState<number|string|null>(null);
  const [group,setGroup]=useState("");
  const groups=useMemo(()=>[...new Set(rows.map(r=>r.region).filter((v):v is string=>Boolean(v)))].sort(),[rows]);
  const ordered=[...rows].sort((a,b)=>Number(b.registered)-Number(a.registered)||a.name.localeCompare(b.name));

  async function toggle(r:Row){
    setBusy(r.id);
    const res=await fetch(`/api/polls/${pollId}/guests`,{method:r.registered?"DELETE":"POST",headers:{"content-type":"application/json"},body:JSON.stringify({guestId:r.id})});
    const d=await res.json();
    setMsg(res.ok?(r.registered?`Removed ${r.name}`:`Registered ${r.name}`):d.error||"Could not update participant");
    setBusy(null);if(res.ok)router.refresh();
  }

  async function bulk(method:"POST"|"DELETE"){
    setBusy(method);setMsg("");
    const res=await fetch(`/api/polls/${pollId}/guests`,{method,headers:{"content-type":"application/json"},body:JSON.stringify({all:true})});
    const d=await res.json();
    if(res.ok){setMsg(method==="POST"?`Registered ${d.registered} additional participant(s).`:`Unregistered ${d.unregistered} participant(s).${d.skipped?` ${d.skipped} with submitted votes were kept.`:""}`);router.refresh();}
    else setMsg(d.error||"Could not update participants");
    setBusy(null);
  }

  async function registerGroup(){if(!group)return;setBusy("group");const res=await fetch(`/api/polls/${pollId}/guests`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({region:group})});const d=await res.json();setMsg(res.ok?`Registered ${d.registered} additional guest(s) from ${group}`:d.error||"Could not register region");setBusy(null);if(res.ok)router.refresh();}

  return <>
    <div className="card">
      <div className="actions" style={{marginBottom:14}}><button type="button" className="btn accent" disabled={busy!==null} onClick={()=>bulk("POST")}>Register all</button><button type="button" className="btn secondary" disabled={busy!==null} onClick={()=>bulk("DELETE")}>Unregister all</button><span className="small muted">Submitted voters are protected from unregistration.</span></div>
      <div className="field"><label>Register a whole region</label><div className="actions"><select className="select" value={group} onChange={e=>setGroup(e.target.value)}><option value="">Choose region…</option>{groups.map(g=><option key={g}>{g}</option>)}</select><button type="button" className="btn secondary" disabled={!group||busy!==null} onClick={registerGroup}>Register region</button></div></div>
      {msg&&<div className="notice good" style={{marginTop:12}}>{msg}</div>}
    </div>
    <div style={{height:14}}/>
    <div className="table-wrap"><table><thead><tr><th>Guest</th><th>Region</th><th>Roles</th><th>Participation</th><th>Vote</th><th></th></tr></thead><tbody>{ordered.map(r=><tr key={r.id}><td><strong>{r.name}</strong></td><td>{r.region||"—"}</td><td><div className="role-lines">{r.roles.map(role=><span key={role}>{ROLE_STYLE[role].label}</span>)}</div></td><td>{r.registered?"Registered":"Not registered"}</td><td>{r.has_voted?"Submitted":"—"}</td><td><button className={`btn ${r.registered?"secondary":"accent"}`} disabled={busy===r.id||r.has_voted} onClick={()=>toggle(r)}>{r.has_voted?"Vote recorded":busy===r.id?"Saving…":r.registered?"Unregister":"Register"}</button></td></tr>)}</tbody></table></div>
  </>;
}
