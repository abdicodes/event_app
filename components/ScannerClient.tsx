"use client";

import { useEffect, useRef, useState } from "react";
import type { ScanMode } from "@/lib/types";

type EventOption = { id: number; name: string };
type Result = {
  kind: "idle" | "good" | "warn" | "bad";
  name?: string;
  message: string;
  time?: string;
  eventName?: string;
};

export default function ScannerClient({ events, initialEventId }: { events: EventOption[]; initialEventId?: number }) {
  const [mode, setMode] = useState<ScanMode>("CHECK_IN");
  const initialId = events.some((event) => event.id === initialEventId) ? initialEventId! : (events[0]?.id ?? 0);
  const [eventId, setEventId] = useState<number>(initialId);
  const [result, setResult] = useState<Result>({
    kind: "idle",
    message: events.length ? "Ready to scan a badge" : "Create an event before scanning",
  });
  const [manual, setManual] = useState("");
  const [cameraState, setCameraState] = useState(events.length ? "Starting camera…" : "No event available");
  const [awaitingAck, setAwaitingAck] = useState(false);

  const lockRef = useRef(false);
  const scannerRef = useRef<any>(null);
  const modeRef = useRef<ScanMode>(mode);
  const eventIdRef = useRef(eventId);
  const scannerPanelRef = useRef<HTMLElement | null>(null);
  const resultPanelRef = useRef<HTMLElement | null>(null);
  const lastCameraValueRef = useRef("");
  const ignoreSameUntilRef = useRef(0);

  function readyMessage(nextMode = modeRef.current, nextEventId = eventIdRef.current) {
    const selected = events.find((event) => event.id === nextEventId);
    if (!selected) return "Create an event before scanning";
    return `Ready to ${nextMode === "CHECK_IN" ? "check in" : "check out"} for ${selected.name}`;
  }

  useEffect(() => {
    modeRef.current = mode;
    if (!awaitingAck) setResult({ kind: "idle", message: readyMessage(mode, eventIdRef.current) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    eventIdRef.current = eventId;
    if (!awaitingAck) setResult({ kind: "idle", message: readyMessage(modeRef.current, eventId) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, events]);

  useEffect(() => {
    if (!awaitingAck) return;
    const frame = window.requestAnimationFrame(() => {
      resultPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [awaitingAck, result]);

  function showResult(next: Result, rawValue: string) {
    lastCameraValueRef.current = rawValue;
    setResult(next);
    setAwaitingAck(true);
    try {
      scannerRef.current?.pause?.(true);
    } catch {
      // The scan lock below still prevents another attendance action if pause is unavailable.
    }
  }

  function acknowledgeResult() {
    setAwaitingAck(false);
    setManual("");
    setResult({ kind: "idle", message: readyMessage() });
    ignoreSameUntilRef.current = Date.now() + 2_000;
    lockRef.current = false;
    try {
      scannerRef.current?.resume?.();
    } catch {
      // Some html5-qrcode versions do not expose resume; scanning remains active in those versions.
    }
    window.requestAnimationFrame(() => {
      scannerPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function submit(rawToken: string, source: "camera" | "manual" = "camera") {
    if (!eventIdRef.current || lockRef.current) return;
    if (
      source === "camera" &&
      rawToken === lastCameraValueRef.current &&
      Date.now() < ignoreSameUntilRef.current
    ) {
      return;
    }

    lockRef.current = true;
    try {
      const res = await fetch("/api/attendance/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rawToken,
          mode: modeRef.current,
          eventId: eventIdRef.current,
          scannerLabel: navigator.userAgent.slice(0, 80),
        }),
      });
      const data = await res.json();

      if (res.ok) {
        showResult(
          {
            kind: "good",
            name: data.guest.name,
            message: data.message,
            eventName: data.event?.name,
            time: new Intl.DateTimeFormat("en", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
              timeZone: "Asia/Singapore",
            }).format(new Date(data.timestamp)),
          },
          rawToken,
        );
        if (navigator.vibrate) navigator.vibrate(120);
      } else {
        const warningCodes = [
          "ALREADY_INSIDE",
          "ALREADY_CHECKED_OUT",
          "SCAN_COOLDOWN",
          "NOT_REGISTERED_FOR_EVENT",
          "EVENT_ENDED",
        ];
        showResult(
          {
            kind: warningCodes.includes(data.code) ? "warn" : "bad",
            name: data.guestName,
            message: data.error || "Scan failed",
          },
          rawToken,
        );
        if (navigator.vibrate) navigator.vibrate([80, 70, 80]);
      }
    } catch {
      showResult({ kind: "bad", message: "Network error. No attendance record was created." }, rawToken);
    }
  }

  useEffect(() => {
    if (!events.length) return;
    let cancelled = false;
    (async () => {
      try {
        const mod = await import("html5-qrcode");
        if (cancelled) return;
        const scanner = new mod.Html5Qrcode("reader", {
          formatsToSupport: [mod.Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (width: number, height: number) => ({
              width: Math.min(280, width - 30),
              height: Math.min(280, height - 30),
            }),
            aspectRatio: 1.0,
          },
          (decoded: string) => submit(decoded, "camera"),
          () => {},
        );
        setCameraState("Camera active");
      } catch {
        setCameraState("Camera unavailable — use HTTPS, allow camera access, or enter the badge code manually.");
      }
    })();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      if (scanner) scanner.stop().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const icon = result.kind === "good" ? "✓" : result.kind === "warn" ? "!" : result.kind === "bad" ? "×" : "⌁";

  return (
    <div className="scanner-layout">
      <section className="card scanner-panel scanner-scroll-target" ref={scannerPanelRef}>
        <div className="field" style={{ marginBottom: 12 }}>
          <label htmlFor="scan-event">Event</label>
          <select
            id="scan-event"
            className="select"
            value={eventId || ""}
            onChange={(event) => setEventId(Number(event.target.value))}
            disabled={!events.length || awaitingAck}
          >
            {!events.length && <option value="">No events available</option>}
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mode-grid" role="group" aria-label="Scan mode">
          <button
            className={`mode-btn ${mode === "CHECK_IN" ? "active" : ""}`}
            onClick={() => setMode("CHECK_IN")}
            type="button"
            disabled={!events.length || awaitingAck}
          >
            Check in
          </button>
          <button
            className={`mode-btn ${mode === "CHECK_OUT" ? "active" : ""}`}
            onClick={() => setMode("CHECK_OUT")}
            type="button"
            disabled={!events.length || awaitingAck}
          >
            Check out
          </button>
        </div>

        <div id="reader" aria-label="QR camera scanner" />
        <p className="small muted">{awaitingAck ? "Scan paused — confirm the result below." : cameraState}</p>

        <form
          className="actions"
          onSubmit={(event) => {
            event.preventDefault();
            if (manual.trim()) submit(manual.trim(), "manual");
          }}
        >
          <input
            className="input"
            style={{ flex: 1 }}
            placeholder="Manual badge code"
            value={manual}
            onChange={(event) => setManual(event.target.value)}
            disabled={!events.length || awaitingAck}
          />
          <button className="btn secondary" disabled={!events.length || awaitingAck}>
            Submit code
          </button>
        </form>
      </section>

      <aside className="card scan-result-panel scanner-scroll-target" ref={resultPanelRef}>
        <div className={`scan-result ${result.kind}`} aria-live="polite">
          <div>
            <div className="icon">{icon}</div>
            {result.name && <div className="name">{result.name}</div>}
            {result.eventName && <div className="small muted scan-event-name">{result.eventName}</div>}
            <div className="message">{result.message}</div>
            {result.time && <div className="scan-result-time">{result.time} GMT+8</div>}
            {awaitingAck && (
              <button className="btn accent scan-ok-btn" type="button" onClick={acknowledgeResult} autoFocus>
                OK — next scan
              </button>
            )}
          </div>
        </div>
        <p className="small muted scanner-help">
          Check the result before continuing. Press OK to return to the camera for the next badge.
        </p>
      </aside>
    </div>
  );
}
