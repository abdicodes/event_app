"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ROLE_OPTIONS, ROLE_STYLE, type RoleCode, validateGuestRoles } from "@/lib/roles";

export default function GuestRolesEditor({guestId,roles}:{guestId:number;roles:RoleCode[]}){
  const router=useRouter();
  const [editing,setEditing]=useState(false);
  const [role1,setRole1]=useState<RoleCode>(roles[0]??"DELEGATE");
  const [role2,setRole2]=useState<RoleCode|"">(roles[1]??"");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  async function save(){
    const next=[role1,role2].filter(Boolean) as RoleCode[];
    const check=validateGuestRoles(next);
    if(!check.ok){setError(check.error);return;}
    setBusy(true);setError("");
    const res=await fetch(`/api/guests/${guestId}/roles`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({roles:next})});
    const data=await res.json().catch(()=>({}));
    setBusy(false);
    if(!res.ok){setError(data.error||"Could not update roles");return;}
    setEditing(false);router.refresh();
  }

  if(!editing) return <div className="role-editor-view">
    <div className="role-lines">{roles.map(role=><span key={role}>{ROLE_STYLE[role].label}</span>)}</div>
    <button className="btn secondary role-edit-btn" type="button" onClick={()=>setEditing(true)}>Edit</button>
  </div>;

  return <div className="role-editor-form">
    <select className="select" value={role1} onChange={e=>setRole1(e.target.value as RoleCode)}>{ROLE_OPTIONS.map(r=><option key={r.code} value={r.code}>{r.label}</option>)}</select>
    <select className="select" value={role2} onChange={e=>setRole2(e.target.value as RoleCode|"")}><option value="">None</option>{ROLE_OPTIONS.map(r=><option key={r.code} value={r.code}>{r.label}</option>)}</select>
    <div className="actions"><button className="btn accent" type="button" disabled={busy} onClick={save}>Save</button><button className="btn secondary" type="button" disabled={busy} onClick={()=>{setEditing(false);setError("");}}>Cancel</button></div>
    {error&&<span className="small" style={{color:"var(--danger)"}}>{error}</span>}
  </div>;
}
