import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import VotesClient from "@/components/VotesClient";

export default function VotesPage() {
  return (
    <main className="public-shell">
      <header className="public-head">
        <Link href="/congress" className="public-brand"><BrandLogo/></Link>
        <div>
          <h1>Live voting</h1>
          <p>Scan your own badge. If you are registered for a live poll, your ballot will open here.</p>
        </div>
      </header>
      <VotesClient />
    </main>
  );
}
