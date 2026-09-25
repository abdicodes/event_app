import ScannerClient from "@/components/ScannerClient";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ScannerPage({searchParams}:{searchParams:Promise<{event?:string}>}){
  const params=await searchParams;
  const events = await sql<{id:number;name:string;starts_at:Date|null;last_check_in:Date|null;created_at:Date}[]>`
    SELECT e.id,e.name,e.starts_at,e.created_at,
      MAX(al.created_at) FILTER (WHERE al.action='CHECK_IN') AS last_check_in
    FROM events e
    LEFT JOIN attendance_logs al ON al.event_id=e.id
    GROUP BY e.id,e.name,e.starts_at,e.created_at
    ORDER BY (MAX(al.created_at) FILTER (WHERE al.action='CHECK_IN') IS NULL), MAX(al.created_at) FILTER (WHERE al.action='CHECK_IN') DESC NULLS LAST, e.created_at DESC
  `;
  return <>
    <div className="page-head"><div><h1>Badge scanner</h1><p>Select the event and action, then scan. Staff receive immediate feedback before another attendance record can be created.</p></div></div>
    <ScannerClient events={events.map(e=>({id:e.id,name:e.name}))} initialEventId={Number(params.event)}/>
  </>;
}
