"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { gmt8LocalInputToIso } from "@/lib/timezone";

export default function PollManager() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [choiceMode, setChoiceMode] = useState<"SINGLE" | "MULTIPLE">("SINGLE");
  const [optionsText, setOptionsText] = useState("Yes\nNo");
  const optionCount = useMemo(() => optionsText.split(/\r?\n/).map(v => v.trim()).filter(Boolean).length, [optionsText]);

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      title: fd.get("title"),
      description: fd.get("description"),
      startsAt: fd.get("startsAt") ? gmt8LocalInputToIso(String(fd.get("startsAt"))) : null,
      endsAt: fd.get("endsAt") ? gmt8LocalInputToIso(String(fd.get("endsAt"))) : null,
      options: optionsText.split(/\r?\n/).map(v => v.trim()).filter(Boolean),
      choiceMode,
      minSelections: choiceMode === "SINGLE" ? 1 : Number(fd.get("minSelections")),
      maxSelections: choiceMode === "SINGLE" ? 1 : Number(fd.get("maxSelections")),
    };

    const res = await fetch("/api/polls", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setMessage(res.ok ? "Poll created. Register participating guests next." : data.error || "Could not create poll");
    if (res.ok) {
      form.reset();
      setChoiceMode("SINGLE");
      setOptionsText("Yes\nNo");
      router.refresh();
    }
  }

  return (
    <form className="card" onSubmit={create}>
      <h2>Create poll / vote</h2>
      <p className="small muted">Poll opening and closing times use GMT+8.</p>
      <p className="small muted">Create the ballot, choose whether participants may select one or multiple answers, then register eligible guests.</p>

      <div className="field">
        <label>Poll title</label>
        <input className="input" name="title" required maxLength={160} />
      </div>

      <div style={{ height: 10 }} />
      <div className="field">
        <label>Description (optional)</label>
        <input className="input" name="description" maxLength={500} />
      </div>

      <div style={{ height: 10 }} />
      <div className="form-row">
        <div className="field">
          <label>Opens (GMT+8, optional)</label>
          <input className="input" type="datetime-local" name="startsAt" />
        </div>
        <div className="field">
          <label>Closes (GMT+8, optional)</label>
          <input className="input" type="datetime-local" name="endsAt" />
        </div>
        <div className="field">
          <label>Answer type</label>
          <select className="select" value={choiceMode} onChange={e => setChoiceMode(e.target.value as "SINGLE" | "MULTIPLE")}>
            <option value="SINGLE">One answer only</option>
            <option value="MULTIPLE">Multiple answers</option>
          </select>
        </div>
      </div>

      <div style={{ height: 10 }} />
      <div className={choiceMode === "MULTIPLE" ? "form-row" : "grid"}>
        <div className="field" style={{ gridColumn: choiceMode === "MULTIPLE" ? "span 1" : undefined }}>
          <label>Options</label>
          <textarea
            className="textarea poll-options"
            name="options"
            required
            value={optionsText}
            onChange={e => setOptionsText(e.target.value)}
            placeholder={'Option A\nOption B'}
          />
          <span className="small muted">{optionCount} option{optionCount === 1 ? "" : "s"}</span>
        </div>

        {choiceMode === "MULTIPLE" && (
          <>
            <div className="field">
              <label>Minimum answers</label>
              <input className="input" type="number" name="minSelections" defaultValue={1} min={1} max={Math.max(1, optionCount)} required />
              <span className="small muted">Guest must select at least this many.</span>
            </div>
            <div className="field">
              <label>Maximum answers</label>
              <input className="input" type="number" name="maxSelections" defaultValue={Math.max(1, Math.min(2, optionCount))} min={1} max={Math.max(1, optionCount)} required />
              <span className="small muted">Cannot exceed the number of options.</span>
            </div>
          </>
        )}
      </div>

      <button className="btn accent" style={{ marginTop: 14 }}>Create poll</button>
      {message && <div className={`notice ${message.startsWith("Poll created") ? "good" : "bad"}`} style={{ marginTop: 12 }}>{message}</div>}
    </form>
  );
}
