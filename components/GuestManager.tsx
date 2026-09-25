"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function GuestManager(){
  const router=useRouter();
  const [message,setMessage]=useState("");
  const [csv,setCsv]=useState("name,delegation_wg\nJane Example,Working Group A");

  async function add(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const form=e.currentTarget;
    const fd=new FormData(form);
    const payload=Object.fromEntries(fd.entries());
    const res=await fetch("/api/guests",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
    const data=await res.json();
    setMessage(res.ok?`Added ${data.guest.name}. Their QR badge can now be reused for any event.`:data.error);
    if(res.ok){form.reset();router.refresh();}
  }

  async function importCsv(){
    const res=await fetch("/api/guests/import",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({csv})});
    const data=await res.json();
    setMessage(res.ok?`Imported ${data.imported} guest(s). Register them to events separately.`:data.error);
    if(res.ok) router.refresh();
  }

  return <div className="grid two">
    <form className="card" onSubmit={add}>
      <h2>Add one guest</h2>
      <p className="small muted">Guests are independent from events. Each person receives one persistent QR badge.</p>
      <div className="field"><label>Name</label><input className="input" name="name" required maxLength={120}/></div>
      <div style={{height:10}}/><div className="field"><label>Delegation/WG (optional)</label><input className="input" name="delegationWg" maxLength={120}/></div>
      <button className="btn accent" style={{marginTop:14}}>Add guest</button>
    </form>
    <div className="card">
      <h2>Import guest directory</h2>
      <p className="small muted">Header: <code>name,delegation_wg</code>. Importing does not automatically register guests for an event.</p>
      <textarea className="textarea" value={csv} onChange={e=>setCsv(e.target.value)}/>
      <button className="btn secondary" style={{marginTop:10}} onClick={importCsv} type="button">Import guests</button>
    </div>
    {message && <div className="notice good" style={{gridColumn:"1/-1"}}>{message}</div>}
  </div>;
}
