"use client";
import { useEffect } from "react";

export default function AutoCheckoutHeartbeat(){
  useEffect(()=>{
    let cancelled=false;
    async function reconcile(){
      if(cancelled||document.visibilityState!=="visible") return;
      try{ await fetch("/api/attendance/reconcile",{method:"POST"}); }catch{}
    }
    reconcile();
    const id=window.setInterval(reconcile,60_000);
    const onVisibility=()=>{ if(document.visibilityState==="visible") reconcile(); };
    document.addEventListener("visibilitychange",onVisibility);
    return ()=>{cancelled=true;window.clearInterval(id);document.removeEventListener("visibilitychange",onVisibility);};
  },[]);
  return null;
}
