"use client";

import { useEffect, useRef, useState } from "react";

type Poll = {
  id: number;
  title: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  choice_mode: "SINGLE" | "MULTIPLE";
  min_selections: number;
  max_selections: number;
  voted: boolean;
  options: { id: number; label: string }[];
};

type Guest = {
  name: string;
  region?: string | null;
};

export default function VotesClient() {
  const [credential, setCredential] = useState("");
  const [guest, setGuest] = useState<Guest | null>(null);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [message, setMessage] = useState("");
  const [camera, setCamera] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selections, setSelections] = useState<Record<number, number[]>>({});
  const scannerRef = useRef<any>(null);

  async function identify(value: string) {
    setMessage("");

    const res = await fetch("/api/public/polls", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ credential: value }),
    });

    const data = await res.json();

    if (!res.ok) {
      setGuest(null);
      setPolls([]);
      setSelections({});
      setMessage(data.error || "Could not identify badge");
      return;
    }

    setCredential(value);
    setGuest(data.guest);
    setPolls(data.polls);
    setSelections({});

    if (!data.polls.length) {
      setMessage(
        "Badge recognized, but you are not registered for a poll that is live right now.",
      );
    }
  }

  async function startCamera() {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setMessage(
        "Camera scanning requires HTTPS. Use the secure congress website or enter your badge code below.",
      );
      return;
    }

    setCamera(true);
    setMessage("");

    await new Promise<void>(resolve =>
      requestAnimationFrame(() => resolve()),
    );

    try {
      const mod = await import("html5-qrcode");

      const scanner = new mod.Html5Qrcode("guest-reader", {
        formatsToSupport: [mod.Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });

      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 240, height: 240 },
        },
        async decoded => {
          await scanner.stop().catch(() => {});
          scannerRef.current = null;
          setCamera(false);
          await identify(decoded);
        },
        () => {},
      );
    } catch {
      setCamera(false);
      setMessage(
        "Camera could not start. Check browser camera permission or use the badge code fallback.",
      );
    }
  }

  async function stopCamera() {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {});
    }

    scannerRef.current = null;
    setCamera(false);
  }

  useEffect(
    () => () => {
      scannerRef.current?.stop?.().catch?.(() => {});
    },
    [],
  );

  function setSingle(pollId: number, optionId: number) {
    setSelections(prev => ({
      ...prev,
      [pollId]: [optionId],
    }));
  }

  function toggleMultiple(poll: Poll, optionId: number) {
    setSelections(prev => {
      const current = prev[poll.id] || [];

      if (current.includes(optionId)) {
        return {
          ...prev,
          [poll.id]: current.filter(id => id !== optionId),
        };
      }

      if (current.length >= poll.max_selections) {
        return prev;
      }

      return {
        ...prev,
        [poll.id]: [...current, optionId],
      };
    });
  }

  function validCount(poll: Poll) {
    const count = (selections[poll.id] || []).length;

    return (
      count >= poll.min_selections &&
      count <= poll.max_selections
    );
  }

  async function submitAllVotes() {
    const remainingPolls = polls.filter(poll => !poll.voted);

    if (!remainingPolls.length) {
      setMessage("There are no remaining votes to submit.");
      return;
    }

    const incompletePoll = remainingPolls.find(
      poll => !validCount(poll),
    );

    if (incompletePoll) {
      setMessage(
        `Please complete "${incompletePoll.title}" before submitting all votes.`,
      );
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const res = await fetch("/api/public/polls/vote-all", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          credential,
          votes: remainingPolls.map(poll => ({
            pollId: poll.id,
            optionIds: selections[poll.id] || [],
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(
          data.error || "Could not submit all votes",
        );
        return;
      }

      await identify(credential);
      setMessage("All votes submitted successfully.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!guest) {
    return (
      <div className="public-card vote-identification-card">
        <h2>Scan your badge</h2>

        <p className="muted">
          Use the same QR badge used for congress check-in. Your identity is used
          only to verify which live polls you are registered for.
        </p>

        <div className="actions" style={{ marginTop: 14 }}>
          {!camera ? (
            <button
              className="public-btn"
              type="button"
              onClick={startCamera}
            >
              Start camera
            </button>
          ) : (
            <button
              className="public-btn secondary"
              type="button"
              onClick={stopCamera}
            >
              Stop camera
            </button>
          )}
        </div>

        <div
          id="guest-reader"
          className="guest-reader"
          style={{
            display: camera ? "block" : "none",
          }}
        />

        <details className="manual-badge-fallback">
          <summary>Enter badge code instead</summary>

          <div
            className="guest-identify"
            style={{ marginTop: 12 }}
          >
            <input
              className="input"
              value={credential}
              onChange={e => setCredential(e.target.value)}
              placeholder="G-XXXXXXXXXX"
              autoCapitalize="characters"
            />

            <button
              className="public-btn secondary"
              type="button"
              onClick={() => identify(credential)}
            >
              Continue
            </button>
          </div>
        </details>

        {message && (
          <div
            className="notice warn"
            style={{ marginTop: 14 }}
          >
            {message}
          </div>
        )}
      </div>
    );
  }

  const remainingPolls = polls.filter(poll => !poll.voted);
  const allRemainingValid =
    remainingPolls.length > 0 &&
    remainingPolls.every(poll => validCount(poll));

  return (
    <div className="public-card">
      <div className="voter-identity">
        <span className="small muted">Voting as</span>
        <h2>{guest.name}</h2>

        {guest.region && (
          <span className="muted">
            {guest.region}
          </span>
        )}
      </div>

      {message && (
        <div
          className={`notice ${
            message.startsWith("All votes submitted")
              ? "good"
              : "warn"
          }`}
          style={{ marginTop: 14 }}
        >
          {message}
        </div>
      )}

      <div className="poll-stack">
        {polls.map(poll => {
          const selected = selections[poll.id] || [];

          const instruction =
            poll.choice_mode === "SINGLE"
              ? "Select one answer"
              : poll.min_selections === poll.max_selections
                ? `Select exactly ${poll.min_selections} answers`
                : `Select ${poll.min_selections}–${poll.max_selections} answers`;

          return (
            <article
              className="poll-card"
              key={poll.id}
            >
              <h3>{poll.title}</h3>

              {poll.description && (
                <div
                  style={{
                    width: "100%",
                    border: "1px solid var(--border)",
                    background: "white",
                    color: "var(--text)",
                    borderRadius: 10,
                    padding: "12px",
                    marginBottom: 12,
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                  }}
                >
                  {poll.description}
                </div>
              )}

              <div className="small muted poll-rule">
                {instruction}
              </div>

              {poll.voted ? (
                <div className="notice good">
                  Vote submitted
                </div>
              ) : (
                <>
                  <div
                    className="vote-options"
                    role={
                      poll.choice_mode === "SINGLE"
                        ? "radiogroup"
                        : "group"
                    }
                    aria-label={poll.title}
                  >
                    {poll.options.map(option => {
                      const checked =
                        selected.includes(option.id);

                      return (
                        <label
                          className={`vote-choice ${
                            checked ? "selected" : ""
                          }`}
                          key={option.id}
                        >
                          <input
                            type={
                              poll.choice_mode === "SINGLE"
                                ? "radio"
                                : "checkbox"
                            }
                            name={`poll-${poll.id}`}
                            checked={checked}
                            disabled={submitting}
                            onChange={() =>
                              poll.choice_mode === "SINGLE"
                                ? setSingle(
                                    poll.id,
                                    option.id,
                                  )
                                : toggleMultiple(
                                    poll,
                                    option.id,
                                  )
                            }
                          />

                          <span>{option.label}</span>
                        </label>
                      );
                    })}
                  </div>

                  <div
                    className="small muted"
                    style={{ marginTop: 10 }}
                  >
                    Selected: {selected.length}
                  </div>
                </>
              )}
            </article>
          );
        })}
      </div>

      {remainingPolls.length > 0 && (
        <div
          className="card"
          style={{
            marginTop: 18,
            textAlign: "center",
          }}
        >
          {!allRemainingValid && (
            <p
              className="small muted"
              style={{ marginTop: 0 }}
            >
              Complete an answer for every poll before submitting.
            </p>
          )}

          <button
            className="public-btn"
            type="button"
            disabled={!allRemainingValid || submitting}
            onClick={submitAllVotes}
            style={{
              width: "100%",
              maxWidth: 420,
            }}
          >
            {submitting
              ? "Submitting..."
              : remainingPolls.length === 1
                ? "Submit vote"
                : `Submit all ${remainingPolls.length} votes`}
          </button>

          <p
            className="small muted"
            style={{ marginBottom: 0 }}
          >
            All selected votes are submitted together.
          </p>
        </div>
      )}

      {polls.length > 0 && remainingPolls.length === 0 && (
        <div
          className="notice good"
          style={{ marginTop: 18 }}
        >
          All available votes have been submitted.
        </div>
      )}
    </div>
  );
}
