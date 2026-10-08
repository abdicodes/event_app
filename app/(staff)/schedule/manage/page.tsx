import ScheduleManager from "@/components/ScheduleManager";
import { sql } from "@/lib/db";
export const dynamic="force-dynamic";
export default async function ManageSchedulePage(){
  const rows=await sql<{id:number;day:string;start_time:string;end_time:string|null;title:string;description:string|null;location:string|null}[]>`
    SELECT id,day::text,start_time::text,end_time::text,title,description,location FROM schedule_items ORDER BY day,start_time,id
  `;
  return <><div className="page-head"><div><h1>Schedule editor</h1><p>Create and edit the public daily programme. Guests can move between days using two controls at the top of the public schedule.</p></div></div><ScheduleManager items={rows}/></>;
}
