"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
<<<<<<< HEAD
=======
import BrandLogo from "@/components/BrandLogo";
>>>>>>> 50ba541 (Updated project)

export default function Nav() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }
  return (
    <header className="topbar">
<<<<<<< HEAD
      <Link href="/dashboard" className="brand"><span className="brand-mark">GF</span><span>{process.env.NEXT_PUBLIC_APP_NAME || "GuestFlow"}</span></Link>
=======
      <Link href="/dashboard" className="brand site-brand-link" aria-label="Dashboard"><BrandLogo compact/></Link>
>>>>>>> 50ba541 (Updated project)
      <nav className="nav" aria-label="Main navigation">
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/events">Events</Link>
        <Link href="/scanner">Scanner</Link>
        <Link href="/guests">Guests</Link>
<<<<<<< HEAD
        <Link href="/badges">Badges</Link>
=======
        <Link href="/schedule/manage">Schedule</Link>
        <Link href="/polls">Polls</Link>
        <Link href="/badges">Badges</Link>
        <Link href="/congress" target="_blank">Congress</Link>
>>>>>>> 50ba541 (Updated project)
        <button className="btn secondary" type="button" onClick={logout}>Sign out</button>
      </nav>
    </header>
  );
}
