"use client";

import { useEffect, useRef, useState } from "react";
import type { ScanMode } from "@/lib/types";

type EventOption = { id:number; name:string };
type Result = { kind:"idle"|"good"|"warn"|"bad"; name?:string; message:string; time?:string; eventName?:string };

export default function ScannerClient({ events, initialEventId }:{ events:EventOption[]; initialEventId?:number }) {
  const [mode,setMode] = useState<ScanMode>("CHECK_IN");
  const initialId = events.some(e=>e.id===initialEventId) ? initialEventId! : (events[0]?.id ?? 0);
  const [eventId,setEventId] = useState<number>(initialId);
  const [result,setResult] = useState<Result>({kind:"idle",message:events.length?"Ready to scan a badge":"Create an event before scanning"});
  const [manual,setManual] = useState("");
  const [cameraState,setCameraState] = useState(events.length?"Starting camera…":"No event available");
  const lockRef = useRef(false);
  const scannerRef = useRef<any>(null);
  const modeRef = useRef<ScanMode>(mode);
  const eventIdRef = useRef(eventId);

  useEffect(()=>{ modeRef.current=mode; },[mode]);
  useEffect(()=>{
    eventIdRef.current=eventId;
    const selected=events.find(e=>e.id===eventId);
    if(selected) setResult({kind:"idle",message:`Ready to ${modeRef.current === "CHECK_IN" ? "check in" : "check out"} for ${selected.name}`});
  },[eventId,events]);

  async function submit(rawToken:string) {
    if (lockRef.current || !eventIdRef.current) return;
    lockRef.current = true;
    try {
      const res = await fetch("/api/attendance/scan", {
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({ rawToken, mode:modeRef.current, eventId:eventIdRef.current, scannerLabel:navigator.userAgent.slice(0,80) })
      });
      const data = await res.json();
      if (res.ok) {
        setResult({kind:"good",name:data.guest.name,message:data.message,eventName:data.event?.name,time:new Intl.DateTimeFormat("en",{hour:"2-digit",minute:"2-digit",hour12:false,timeZone:"Asia/Singapore"}).format(new Date(data.timestamp))});
        if (navigator.vibrate) navigator.vibrate(120);
      } else {
        const warningCodes = ["ALREADY_INSIDE","ALREADY_CHECKED_OUT","SCAN_COOLDOWN","NOT_REGISTERED_FOR_EVENT","EVENT_ENDED"];
        setResult({kind:warningCodes.includes(data.code)?"warn":"bad",name:data.guestName,message:data.error || "Scan failed"});
        if (navigator.vibrate) navigator.vibrate([80,70,80]);
      }
    } catch {
      setResult({kind:"bad",message:"Network error. No attendance record was created."});
    } finally {
      window.setTimeout(()=>{ lockRef.current=false; }, 1400);
    }
  }

  useEffect(()=>{
    if(!events.length) return;
    let cancelled=false;
    (async()=>{
      try {
        const mod = await import("html5-qrcode");
        if (cancelled) return;
        const scanner = new mod.Html5Qrcode("reader", { formatsToSupport:[mod.Html5QrcodeSupportedFormats.QR_CODE], verbose:false });
        scannerRef.current=scanner;
        await scanner.start(
          { facingMode:"environment" },
          { fps:10, qrbox:(w:number,h:number)=>({width:Math.min(280,w-30),height:Math.min(280,h-30)}), aspectRatio:1.0 },
          (decoded:string)=>submit(decoded),
          ()=>{}
        );
        setCameraState("Camera active");
      } catch {
        setCameraState("Camera unavailable — use HTTPS, allow camera access, or enter the token manually.");
      }
    })();
    return ()=>{ cancelled=true; const s=scannerRef.current; if(s) s.stop().catch(()=>{}); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const icon = result.kind==="good"?"✓":result.kind==="warn"?"!":result.kind==="bad"?"×":"⌁";
  return <div className="scanner-layout">
    <section className="card scanner-panel">
      <div className="field" style={{marginBottom:12}}>
        <label htmlFor="scan-event">Event</label>
        <select id="scan-event" className="select" value={eventId || ""} onChange={e=>setEventId(Number(e.target.value))} disabled={!events.length}>
          {!events.length && <option value="">No events available</option>}
          {events.map(event=><option key={event.id} value={event.id}>{event.name}</option>)}
        </select>
      </div>
      <div className="mode-grid" role="group" aria-label="Scan mode">
        <button className={`mode-btn ${mode==="CHECK_IN"?"active":""}`} onClick={()=>setMode("CHECK_IN")} type="button" disabled={!events.length}>Check in</button>
        <button className={`mode-btn ${mode==="CHECK_OUT"?"active":""}`} onClick={()=>setMode("CHECK_OUT")} type="button" disabled={!events.length}>Check out</button>
      </div>
      <div id="reader" aria-label="QR camera scanner" />
      <p className="small muted">{cameraState}</p>
      <form className="actions" onSubmit={e=>{e.preventDefault(); if(manual.trim()) submit(manual.trim());}}>
        <input className="input" style={{flex:1}} placeholder="Manual badge code for testing" value={manual} onChange={e=>setManual(e.target.value)} disabled={!events.length} />
        <button className="btn secondary" disabled={!events.length}>Submit token</button>
      </form>
    </section>
    <aside className="card">
      <div className={`scan-result ${result.kind}`} aria-live="polite">
        <div>
          <div className="icon">{icon}</div>
          {result.name && <div className="name">{result.name}</div>}
          {result.eventName && <div className="small muted" style={{marginTop:4}}>{result.eventName}</div>}
          <div className="message">{result.message}</div>
          {result.time && <div style={{marginTop:10,fontWeight:800}}>{result.time} GMT+8</div>}
        </div>
      </div>
      <p className="small muted" style={{marginBottom:0}}>Only two attendance actions are available: check in and check out. Duplicate scans and unregistered badges are rejected server-side. If the event end time has passed, everyone still inside is checked out automatically.</p>
    </aside>
  </div>;
}
