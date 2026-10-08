import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import ScheduleTimeline from "@/components/ScheduleTimeline";
import { sql } from "@/lib/db";
export const dynamic="force-dynamic";
export default async function PublicSchedulePage(){
  const items=await sql<{id:number;day:string;start_time:string;end_time:string|null;title:string;description:string|null;location:string|null}[]>`
    SELECT id,day::text,start_time::text,end_time::text,title,description,location FROM schedule_items ORDER BY day,start_time,id
  `;
  return <main className="public-shell"><header className="public-head"><Link href="/congress" className="public-brand"><BrandLogo/></Link><div><h1>Activities & programme</h1><p className="muted">All programme times are GMT+8.</p><p>Choose a day, then scroll down to see the programme in chronological order.</p></div></header><ScheduleTimeline items={items}/></main>;
}
