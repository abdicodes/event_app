import postgres from "postgres";
import { requireEnv } from "./env.mjs";

const databaseUrl = requireEnv("DATABASE_URL");
const sql = postgres(databaseUrl, { ssl: databaseUrl.includes("localhost") ? false : "require", max: 1 });

const guests = [
  ["Amina Noor", "Delegation A", "demo_AMINA_7M5dRWm7vFx2K9Pt", "G-A1B2C3D4E5", ["DELEGATE","FACILITATOR"]],
  ["Leo Martin", "Working Group 1", "demo_LEO_B4k7nJ2vQ9mT6xWp", "G-B1C2D3E4F5", ["GLOBAL_SUPPORT"]],
  ["Sara Chen", "Delegation B", "demo_SARA_N8p2cR5yH7kL4mQz", "G-C1D2E3F4A5", ["LOCAL_SUPPORT"]],
  ["Omar Hassan", "Working Group 2", "demo_OMAR_T3w9bF6nK2qP8xLs", "G-D1E2F3A4B5", ["DELEGATE"]],
  ["Maya Singh", "Delegation C", "demo_MAYA_J6r2vC9mW4pN8kTx", "G-E1F2A3B4C5", ["FACILITATOR"]],
  ["Daniel Kim", "Working Group 3", "demo_DANIEL_Q5n8xL2cV7mR4pKw", "G-F1A2B3C4D5", ["DELEGATE","GLOBAL_SUPPORT"]],
];

const ids = {};
for (const [name, region, token, badgeCode, roles] of guests) {
  const row = await sql.begin(async tx => {
    const created = (await tx`
      INSERT INTO guests(name,region,qr_token,badge_code)
      VALUES(${name},${region},${token},${badgeCode})
      ON CONFLICT(qr_token) DO UPDATE
        SET name=EXCLUDED.name,region=EXCLUDED.region,badge_code=EXCLUDED.badge_code
      RETURNING id
    `)[0];
    await tx`DELETE FROM guest_roles WHERE guest_id=${created.id}`;
    for (let i = 0; i < roles.length; i++) {
      await tx`INSERT INTO guest_roles(guest_id,role_code,position) VALUES(${created.id},${roles[i]},${i + 1})`;
    }
    await tx`INSERT INTO event_guests(event_id,guest_id) VALUES(1,${created.id}) ON CONFLICT(event_id,guest_id) DO NOTHING`;
    return created;
  });
  ids[name] = row.id;
}

const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);
const schedule = [
  [ymd(today), "09:00", "09:30", "Registration & coffee", "Main foyer", "Badge collection and welcome coffee"],
  [ymd(today), "09:30", "10:15", "Opening session", "Main hall", "Welcome and opening remarks"],
  [ymd(today), "10:30", "12:00", "Working group sessions", "Breakout rooms", "Parallel Region programme"],
  [ymd(tomorrow), "09:30", "11:00", "Morning programme", "Main hall", "Second-day programme"],
  [ymd(tomorrow), "11:15", "12:00", "Closing session", "Main hall", "Summary and next steps"],
];
for (const [day, start, end, title, location, description] of schedule) {
  await sql`
    INSERT INTO schedule_items(day,start_time,end_time,title,location,description)
    SELECT ${day},${start},${end},${title},${location},${description}
    WHERE NOT EXISTS (SELECT 1 FROM schedule_items WHERE day=${day} AND start_time=${start} AND title=${title})
  `;
}

async function ensurePoll({ title, description, choiceMode, minSelections, maxSelections, options, participants }) {
  let poll = (await sql`SELECT id FROM polls WHERE title=${title} LIMIT 1`)[0];
  if (!poll) {
    poll = (await sql`
      INSERT INTO polls(title,description,choice_mode,min_selections,max_selections)
      VALUES(${title},${description},${choiceMode},${minSelections},${maxSelections})
      RETURNING id
    `)[0];
    for (let i = 0; i < options.length; i++) {
      await sql`INSERT INTO poll_options(poll_id,label,position) VALUES(${poll.id},${options[i]},${i})`;
    }
  } else {
    await sql`
      UPDATE polls SET description=${description},choice_mode=${choiceMode},min_selections=${minSelections},max_selections=${maxSelections},updated_at=now()
      WHERE id=${poll.id}
    `;
  }
  for (const name of participants) {
    await sql`INSERT INTO poll_guests(poll_id,guest_id) VALUES(${poll.id},${ids[name]}) ON CONFLICT DO NOTHING`;
  }
}

await ensurePoll({
  title: "Demo General Assembly Vote",
  description: "Single-answer demo ballot.",
  choiceMode: "SINGLE",
  minSelections: 1,
  maxSelections: 1,
  options: ["Yes", "No", "Abstain"],
  participants: ["Amina Noor", "Leo Martin"],
});

await ensurePoll({
  title: "Demo Committee Priorities",
  description: "Multiple-answer demo ballot: choose two or three priorities.",
  choiceMode: "MULTIPLE",
  minSelections: 2,
  maxSelections: 3,
  options: ["Education", "Health", "Climate", "Digital cooperation"],
  participants: ["Amina Noor", "Sara Chen"],
});

await sql.end();
console.log(`Seeded ${guests.length} mock guests, demo schedule items, and single/multiple-choice demo polls.`);
