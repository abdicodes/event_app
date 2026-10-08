"use client";

import { useEffect, useMemo, useState } from "react";

type Item = {
  id: number;
  day: string;
  start_time: string;
  end_time: string | null;
  title: string;
  description: string | null;
  location: string | null;
};

type TimelineState = "past" | "current" | "upcoming";

const GMT8_OFFSET = "+08:00";
const APP_TIME_ZONE = "Asia/Singapore";

function gmt8Today() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function localScheduleMs(day: string, time: string) {
  return new Date(`${day}T${time.slice(0, 8)}${GMT8_OFFSET}`).getTime();
}

function nextDayStartMs(day: string) {
  const start = new Date(`${day}T00:00:00${GMT8_OFFSET}`);
  start.setUTCDate(start.getUTCDate() + 1);
  return start.getTime();
}

export default function ScheduleTimeline({ items }: { items: Item[] }) {
  const days = useMemo(() => [...new Set(items.map((item) => item.day))].sort(), [items]);
  const today = gmt8Today();
  const firstRelevant = days.findIndex((day) => day >= today);
  const initial = firstRelevant === -1 ? Math.max(0, days.length - 1) : firstRelevant;
  const [index, setIndex] = useState(initial);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (index > days.length - 1) setIndex(Math.max(0, days.length - 1));
  }, [days.length, index]);

  if (!days.length) {
    return <div className="public-card empty-state">The programme has not been published yet.</div>;
  }

  const day = days[index];
  const visible = items
    .filter((item) => item.day === day)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const label = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00Z`));

  function statusFor(item: Item, itemIndex: number): TimelineState {
    const startMs = localScheduleMs(item.day, item.start_time);
    const nextItem = visible[itemIndex + 1];
    const endMs = item.end_time
      ? localScheduleMs(item.day, item.end_time)
      : nextItem
        ? localScheduleMs(nextItem.day, nextItem.start_time)
        : nextDayStartMs(item.day);

    if (nowMs < startMs) return "upcoming";
    if (nowMs >= endMs) return "past";
    return "current";
  }

  return (
    <>
      <div className="day-switcher" aria-label="Schedule day controls">
        <button
          className="public-btn secondary"
          type="button"
          disabled={index === 0}
          onClick={() => setIndex((value) => Math.max(0, value - 1))}
        >
          ← Previous day
        </button>
        <div>
          <span className="small muted">Programme · GMT+8</span>
          <strong>{label}</strong>
        </div>
        <button
          className="public-btn secondary"
          type="button"
          disabled={index === days.length - 1}
          onClick={() => setIndex((value) => Math.min(days.length - 1, value + 1))}
        >
          Next day →
        </button>
      </div>

      <div className="timeline">
        {visible.map((item, itemIndex) => {
          const status = statusFor(item, itemIndex);
          return (
            <article className={`timeline-item ${status}`} key={item.id}>
              <div className="timeline-time">
                {item.start_time.slice(0, 5)}
                {item.end_time && <span>{item.end_time.slice(0, 5)}</span>}
              </div>
              <div className="timeline-dot" aria-label={`${status} programme`} />
              <div className="timeline-card">
                <div className={`timeline-status ${status}`}>
                  {status === "current" ? "Now" : status === "past" ? "Past" : "Upcoming"}
                </div>
                <h2>{item.title}</h2>
                {item.location && <div className="timeline-location">{item.location}</div>}
                {item.description && <p>{item.description}</p>}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
