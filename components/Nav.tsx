"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";

export default function Nav() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }
  return (
    <header className="topbar">
      <Link href="/dashboard" className="brand site-brand-link" aria-label="Dashboard"><BrandLogo compact/></Link>
      <nav className="nav" aria-label="Main navigation">
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/events">Events</Link>
        <Link href="/scanner">Scanner</Link>
        <Link href="/guests">Guests</Link>
        <Link href="/schedule/manage">Schedule</Link>
        <Link href="/polls">Polls</Link>
        <Link href="/badges">Badges</Link>
        <Link href="/congress" target="_blank">Congress</Link>
        <button className="btn secondary" type="button" onClick={logout}>Sign out</button>
      </nav>
    </header>
  );
}
