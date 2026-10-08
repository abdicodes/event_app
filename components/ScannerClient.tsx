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

export default function ScannerClient({
  events,
  initialEventId,
}: {
  events: EventOption[];
  initialEventId?: number;
}) {
  const [mode, setMode] = useState<ScanMode>("CHECK_IN");
  const initialId = events.some((event) => event.id === initialEventId)
    ? initialEventId!
    : (events[0]?.id ?? 0);
  const [eventId, setEventId] = useState<number>(initialId);
  const [result, setResult] = useState<Result>({
    kind: "idle",
    message: events.length ? "Ready to scan a badge" : "Create an event before scanning",
  });
  const [manual, setManual] = useState("");
  const [cameraState, setCameraState] = useState(
    events.length ? "Starting camera…" : "No event available",
  );
  const [awaitingAck, setAwaitingAck] = useState(false);

  // Important: these refs are the authoritative values used by the camera callback.
  // They are updated synchronously by the controls below, not later in an effect.
  const modeRef = useRef<ScanMode>("CHECK_IN");
  const eventIdRef = useRef<number>(initialId);
  const awaitingAckRef = useRef(false);
  const requestInFlightRef = useRef(false);
  const scannerRef = useRef<any>(null);
  const scannerPanelRef = useRef<HTMLElement | null>(null);
  const resultPanelRef = useRef<HTMLElement | null>(null);
  const lastProcessedRef = useRef("");
  const suppressSameUntilRef = useRef(0);

  function selectedEventName(id = eventIdRef.current) {
    return events.find((event) => Number(event.id) === Number(id))?.name;
  }

  function readyMessage(nextMode = modeRef.current, nextEventId = eventIdRef.current) {
    const name = selectedEventName(nextEventId);
    if (!name) return "Create an event before scanning";
    return `Ready to ${nextMode === "CHECK_IN" ? "check in" : "check out"} for ${name}`;
  }

  function setAcknowledgementState(value: boolean) {
    awaitingAckRef.current = value;
    setAwaitingAck(value);
  }

  function handleEventChange(nextEventId: number) {
    // Set the ref before React state so a camera callback in the same frame cannot
    // accidentally submit against the previously selected event.
    eventIdRef.current = nextEventId;
    setEventId(nextEventId);
    if (!awaitingAckRef.current) {
      setResult({ kind: "idle", message: readyMessage(modeRef.current, nextEventId) });
    }
  }

  function handleModeChange(nextMode: ScanMode) {
    modeRef.current = nextMode;
    setMode(nextMode);
    if (!awaitingAckRef.current) {
      setResult({ kind: "idle", message: readyMessage(nextMode, eventIdRef.current) });
    }
  }

  useEffect(() => {
    if (!awaitingAck) return;
    const timer = window.setTimeout(() => {
      resultPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
    return () => window.clearTimeout(timer);
  }, [awaitingAck, result]);

  function finishWithResult(next: Result, rawValue: string) {
    lastProcessedRef.current = rawValue;
    setResult(next);
    setAcknowledgementState(true);

    // Do NOT pause html5-qrcode here. Keeping the camera stream running avoids the
    // slow reacquisition that happened after resume() on iPhone. Further decoded
    // frames are simply ignored by awaitingAckRef/requestInFlightRef.
  }

  function acknowledgeResult() {
    // Ignore the same physical badge for a short moment while staff move it away
    // from the camera, but keep the camera itself running continuously.
    suppressSameUntilRef.current = Date.now() + 1800;
    requestInFlightRef.current = false;
    setAcknowledgementState(false);
    setManual("");
    setResult({ kind: "idle", message: readyMessage() });

    window.setTimeout(() => {
      scannerPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 40);
  }

  async function submit(rawCredential: string, source: "camera" | "manual" = "camera") {
    const credential = rawCredential.trim();
    if (!credential) return;
    if (!eventIdRef.current) return;
    if (awaitingAckRef.current || requestInFlightRef.current) return;

    if (
      source === "camera" &&
      credential === lastProcessedRef.current &&
      Date.now() < suppressSameUntilRef.current
    ) {
      return;
    }

    requestInFlightRef.current = true;
    const submittedEventId = eventIdRef.current;
    const submittedMode = modeRef.current;
    const submittedEventName = selectedEventName(submittedEventId);

    try {
      const response = await fetch("/api/attendance/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rawToken: credential,
          mode: submittedMode,
          eventId: submittedEventId,
          scannerLabel: navigator.userAgent.slice(0, 80),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        finishWithResult(
          {
            kind: "good",
            name: data.guest?.name,
            message: data.message || "Attendance updated",
            eventName: data.event?.name || submittedEventName,
            time: data.timestamp
              ? new Intl.DateTimeFormat("en", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                  timeZone: "Asia/Singapore",
                }).format(new Date(data.timestamp))
              : undefined,
          },
          credential,
        );
        if (navigator.vibrate) navigator.vibrate(120);
        return;
      }

      const warningCodes = [
        "ALREADY_INSIDE",
        "ALREADY_CHECKED_OUT",
        "NOT_CHECKED_IN",
        "SCAN_COOLDOWN",
        "NOT_REGISTERED_FOR_EVENT",
        "EVENT_ENDED",
      ];

      finishWithResult(
        {
          kind: warningCodes.includes(data.code) ? "warn" : "bad",
          name: data.guestName,
          message: data.error || "Scan failed",
          // Showing the submitted event on errors makes it immediately obvious if
          // staff accidentally selected the wrong event.
          eventName: submittedEventName,
        },
        credential,
      );
      if (navigator.vibrate) navigator.vibrate([80, 70, 80]);
    } catch {
      finishWithResult(
        {
          kind: "bad",
          message: "Network error. No attendance record was created.",
          eventName: submittedEventName,
        },
        credential,
      );
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
            // Keep the same proven camera configuration as the last working scanner.
            fps: 10,
            qrbox: (width: number, height: number) => ({
              width: Math.min(280, width - 30),
              height: Math.min(280, height - 30),
            }),
            aspectRatio: 1.0,
          },
          (decoded: string) => {
            void submit(decoded, "camera");
          },
          () => {},
        );

        if (!cancelled) setCameraState("Camera active");
      } catch {
        if (!cancelled) {
          setCameraState(
            "Camera unavailable — use HTTPS, allow camera access, or enter the badge code manually.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) scanner.stop().catch(() => {});
    };
    // Camera is deliberately started once. Current mode/event are read from refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const icon =
    result.kind === "good" ? "✓" : result.kind === "warn" ? "!" : result.kind === "bad" ? "×" : "⌁";

  return (
    <div className="scanner-layout">
      <section className="card scanner-panel scanner-scroll-target" ref={scannerPanelRef}>
        <div className="field" style={{ marginBottom: 12 }}>
          <label htmlFor="scan-event">Event</label>
          <select
            id="scan-event"
            className="select"
            value={eventId || ""}
            onChange={(event) => handleEventChange(Number(event.target.value))}
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
            onClick={() => handleModeChange("CHECK_IN")}
            type="button"
            disabled={!events.length || awaitingAck}
          >
            Check in
          </button>
          <button
            className={`mode-btn ${mode === "CHECK_OUT" ? "active" : ""}`}
            onClick={() => handleModeChange("CHECK_OUT")}
            type="button"
            disabled={!events.length || awaitingAck}
          >
            Check out
          </button>
        </div>

        <div id="reader" aria-label="QR camera scanner" />
        <p className="small muted">
          {awaitingAck ? "Result waiting for confirmation below." : cameraState}
        </p>

        <form
          className="actions"
          onSubmit={(event) => {
            event.preventDefault();
            if (manual.trim()) void submit(manual, "manual");
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
              <button className="btn accent scan-ok-btn" type="button" onClick={acknowledgeResult}>
                OK — next scan
              </button>
            )}
          </div>
        </div>
        <p className="small muted scanner-help">
          Check the selected event shown above the result. Press OK to continue with the next badge.
        </p>
      </aside>
    </div>
  );
}
