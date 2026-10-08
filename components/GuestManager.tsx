"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ROLE_OPTIONS, validateGuestRoles } from "@/lib/roles";

export default function GuestManager(){
  const router=useRouter();
  const [message,setMessage]=useState("");
  const [role1,setRole1]=useState("DELEGATE");
  const [role2,setRole2]=useState("");
  const [csv,setCsv]=useState("name,region,role_1,role_2\nJane Example,Europe,DELEGATE,FACILITATOR");

  async function add(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const roleCheck=validateGuestRoles([role1,role2].filter(Boolean));
    if(!roleCheck.ok){setMessage(roleCheck.error);return;}
    const form=e.currentTarget;
    const fd=new FormData(form);
    const payload={name:String(fd.get("name")||""),region:String(fd.get("region")||""),role1,role2};
    const res=await fetch("/api/guests",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
    const data=await res.json();
    setMessage(res.ok?`Added ${data.guest.name}. Their persistent badge is ready.`:data.error);
    if(res.ok){form.reset();setRole1("DELEGATE");setRole2("");router.refresh();}
  }

  async function importCsv(){
    const res=await fetch("/api/guests/import",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({csv})});
    const data=await res.json();
    setMessage(res.ok?`Imported ${data.imported} guest(s)${data.skipped?`; skipped ${data.skipped} invalid row(s)`:""}.`:data.error);
    if(res.ok) router.refresh();
  }

  return <div className="grid two">
    <form className="card" onSubmit={add}>
      <h2>Add one guest</h2>
      <p className="small muted">Each guest must have one or two roles. Global Support and Local Support cannot be combined.</p>
      <div className="field"><label>Name</label><input className="input" name="name" required maxLength={120}/></div>
      <div style={{height:10}}/><div className="field"><label>Region (optional)</label><input className="input" name="region" maxLength={120} placeholder="e.g. Europe"/></div>
      <div className="form-row" style={{marginTop:12}}>
        <div className="field"><label>Role 1</label><select className="select" value={role1} onChange={e=>setRole1(e.target.value)}>{ROLE_OPTIONS.map(r=><option key={r.code} value={r.code}>{r.label}</option>)}</select></div>
        <div className="field"><label>Role 2 (optional)</label><select className="select" value={role2} onChange={e=>setRole2(e.target.value)}><option value="">None</option>{ROLE_OPTIONS.map(r=><option key={r.code} value={r.code}>{r.label}</option>)}</select></div>
      </div>
      <p className="small muted">If Delegate is combined with another role, the other role controls the badge colour. Roles are printed on separate lines.</p>
      <button className="btn accent" style={{marginTop:10}}>Add guest</button>
    </form>
    <div className="card">
      <h2>Import guest directory</h2>
      <p className="small muted">Header: <code>name,region,role_1,role_2</code>. Role 2 may be blank. The two-column header <code>name,region</code> is also accepted and defaults to Delegate.</p>
      <textarea className="textarea" value={csv} onChange={e=>setCsv(e.target.value)}/>
      <button className="btn secondary" style={{marginTop:10}} onClick={importCsv} type="button">Import guests</button>
    </div>
    {message && <div className={`notice ${message.toLowerCase().includes("invalid")||message.toLowerCase().includes("cannot")?"bad":"good"}`} style={{gridColumn:"1/-1"}}>{message}</div>}
  </div>;
}
