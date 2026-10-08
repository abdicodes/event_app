"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeletePollButton({ pollId, title }: { pollId: number; title: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm(`Delete “${title}”? Participants and submitted votes for this poll will also be deleted.`)) return;
    setBusy(true);
    const res = await fetch(`/api/polls/${pollId}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      window.alert(data.error || "Could not delete poll");
      return;
    }
    router.refresh();
  }

  return <button className="btn danger" type="button" disabled={busy} onClick={remove}>{busy ? "Deleting…" : "Delete"}</button>;
}
