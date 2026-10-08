"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CheckoutEventButton({
  eventId,
  eventName,
  insideCount,
}: {
  eventId: number;
  eventName: string;
  insideCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function checkoutAll() {
    if (insideCount < 1 || busy) return;

    const confirmed = window.confirm(
      `Check out all ${insideCount} participant${insideCount === 1 ? "" : "s"} currently inside “${eventName}”?\n\nThis creates checkout attendance logs and cannot be undone from the dashboard.`
    );
    if (!confirmed) return;

    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/events/${eventId}/checkout-all`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "Could not check out the event");
        return;
      }
      setMessage(`Checked out ${data.checkedOut} participant${data.checkedOut === 1 ? "" : "s"}.`);
      router.refresh();
    } catch {
      setMessage("Could not reach the server");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="checkout-event-control">
      <button
        type="button"
        className="btn danger"
        onClick={checkoutAll}
        disabled={busy || insideCount < 1}
        title={insideCount < 1 ? "No participants are currently inside" : `Check out all ${insideCount} participants currently inside`}
      >
        {busy ? "Checking out…" : "Check out whole event"}
      </button>
      {message && <span className="small muted" aria-live="polite">{message}</span>}
    </div>
  );
}
