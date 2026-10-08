import ScannerClient from "@/components/ScannerClient";
import { sql } from "@/lib/db";
<<<<<<< HEAD
=======
import { autoCheckoutExpiredEvents } from "@/lib/events";
>>>>>>> 50ba541 (Updated project)

export const dynamic = "force-dynamic";

export default async function ScannerPage({searchParams}:{searchParams:Promise<{event?:string}>}){
<<<<<<< HEAD
=======
  await autoCheckoutExpiredEvents();
>>>>>>> 50ba541 (Updated project)
  const params=await searchParams;
  const events = await sql<{id:number;name:string;starts_at:Date|null;last_check_in:Date|null;created_at:Date}[]>`
    SELECT e.id,e.name,e.starts_at,e.created_at,
      MAX(al.created_at) FILTER (WHERE al.action='CHECK_IN') AS last_check_in
    FROM events e
    LEFT JOIN attendance_logs al ON al.event_id=e.id
<<<<<<< HEAD
=======
    WHERE e.ends_at IS NULL OR e.ends_at > now()
>>>>>>> 50ba541 (Updated project)
    GROUP BY e.id,e.name,e.starts_at,e.created_at
    ORDER BY (MAX(al.created_at) FILTER (WHERE al.action='CHECK_IN') IS NULL), MAX(al.created_at) FILTER (WHERE al.action='CHECK_IN') DESC NULLS LAST, e.created_at DESC
  `;
  return <>
<<<<<<< HEAD
    <div className="page-head"><div><h1>Badge scanner</h1><p>Select the event and action, then scan. Staff receive immediate feedback before another attendance record can be created.</p></div></div>
=======
    <div className="page-head"><div><h1>Badge scanner</h1><p>Select an active event and choose Check in or Check out. Times are GMT+8.</p></div></div>
>>>>>>> 50ba541 (Updated project)
    <ScannerClient events={events.map(e=>({id:e.id,name:e.name}))} initialEventId={Number(params.event)}/>
  </>;
}
