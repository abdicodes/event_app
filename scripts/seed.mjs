import postgres from "postgres";
import { requireEnv } from "./env.mjs";

const databaseUrl=requireEnv("DATABASE_URL");
const sql=postgres(databaseUrl,{ssl:databaseUrl.includes("localhost")?false:"require",max:1});
const guests=[
  ["Amina Noor","Delegation A","demo_AMINA_7M5dRWm7vFx2K9Pt"],
  ["Leo Martin","Working Group 1","demo_LEO_B4k7nJ2vQ9mT6xWp"],
  ["Sara Chen","Delegation B","demo_SARA_N8p2cR5yH7kL4mQz"],
  ["Omar Hassan","Working Group 2","demo_OMAR_T3w9bF6nK2qP8xLs"],
  ["Maya Singh","Delegation C","demo_MAYA_J6r2vC9mW4pN8kTx"],
  ["Daniel Kim","Working Group 3","demo_DANIEL_Q5n8xL2cV7mR4pKw"]
];
for(const [name,delegationWg,token] of guests){
  const row=(await sql`
    INSERT INTO guests(name,delegation_wg,qr_token)
    VALUES(${name},${delegationWg},${token})
    ON CONFLICT(qr_token) DO UPDATE SET name=EXCLUDED.name,delegation_wg=EXCLUDED.delegation_wg
    RETURNING id
  `)[0];
  await sql`
    INSERT INTO event_guests(event_id,guest_id)
    VALUES(1,${row.id})
    ON CONFLICT(event_id,guest_id) DO NOTHING
  `;
}
await sql.end(); console.log(`Seeded ${guests.length} persistent mock guests and registered them for Demo Event.`);
