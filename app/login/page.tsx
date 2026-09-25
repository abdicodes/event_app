"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password,setPassword] = useState("");
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(false);
  const router = useRouter();
  async function submit(e: FormEvent) {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      const res = await fetch("/api/auth/login", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({password}) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Login failed"); return; }
      router.replace("/dashboard"); router.refresh();
    } finally { setBusy(false); }
  }
  return <div className="login-wrap"><form className="login-card" onSubmit={submit}>
    <div className="brand"><span className="brand-mark">GF</span><span>Staff access</span></div>
    <h1>Event check-in</h1>
    <p className="muted">Sign in on staff devices before scanning guest badges.</p>
    <div className="field" style={{marginTop:20}}><label htmlFor="password">Staff password</label><input id="password" className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required /></div>
    {error && <p className="notice bad" role="alert">{error}</p>}
    <button className="btn accent" style={{width:"100%",marginTop:16}} disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
  </form></div>;
}
