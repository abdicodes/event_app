"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BrandLogo from "@/components/BrandLogo";

const NAV_LINKS = [
  ["/dashboard", "Dashboard"],
  ["/events", "Events"],
  ["/scanner", "Scanner"],
  ["/guests", "Guests"],
  ["/schedule/manage", "Schedule"],
  ["/polls", "Polls"],
  ["/badges", "Badges"],
] as const;

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const links = (mobile = false) => (
    <>
      {NAV_LINKS.map(([href, label]) => (
        <Link key={href} href={href} onClick={() => mobile && setMenuOpen(false)}>
          {label}
        </Link>
      ))}
      <Link href="/congress" target="_blank" onClick={() => mobile && setMenuOpen(false)}>
        Congress
      </Link>
      <button className="btn secondary" type="button" onClick={logout}>
        Sign out
      </button>
    </>
  );

  return (
    <header className="topbar">
      <Link href="/dashboard" className="brand site-brand-link" aria-label="Dashboard">
        <BrandLogo compact />
      </Link>

      <nav className="nav desktop-nav" aria-label="Main navigation">
        {links()}
      </nav>

      <button
        className="mobile-nav-toggle"
        type="button"
        aria-expanded={menuOpen}
        aria-controls="mobile-main-navigation"
        aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span aria-hidden="true">{menuOpen ? "×" : "☰"}</span>
        <span>Menu</span>
      </button>

      <nav
        id="mobile-main-navigation"
        className={`mobile-nav-menu ${menuOpen ? "open" : ""}`}
        aria-label="Mobile navigation"
      >
        {links(true)}
      </nav>
    </header>
  );
}
