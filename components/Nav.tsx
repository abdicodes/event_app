"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Nav() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }
  return (
    <header className="topbar">
      <Link href="/dashboard" className="brand"><span className="brand-mark">GF</span><span>{process.env.NEXT_PUBLIC_APP_NAME || "GuestFlow"}</span></Link>
      <nav className="nav" aria-label="Main navigation">
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/events">Events</Link>
        <Link href="/scanner">Scanner</Link>
        <Link href="/guests">Guests</Link>
        <Link href="/badges">Badges</Link>
        <button className="btn secondary" type="button" onClick={logout}>Sign out</button>
      </nav>
    </header>
  );
}
