"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteGuestButton({guestId,name}:{guestId:number;name:string}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  async function remove(){
    const confirmed=window.confirm(`Delete ${name}? This also removes their event registrations, attendance history, poll registrations and votes. This cannot be undone.`);
    if(!confirmed)return;
    setBusy(true);
    const res=await fetch(`/api/guests/${guestId}`,{method:"DELETE"});
    const data=await res.json().catch(()=>({}));
    setBusy(false);
    if(!res.ok){window.alert(data.error||"Could not delete guest");return;}
    router.refresh();
  }
  return <button type="button" className="btn danger" disabled={busy} onClick={remove}>{busy?"Deleting…":"Delete"}</button>;
}
