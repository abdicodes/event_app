<<<<<<< HEAD
import Link from 'next/link'
import { notFound } from 'next/navigation'
import EventGuestManager from '@/components/EventGuestManager'
import { sql } from '@/lib/db'
import type { GuestStatus } from '@/lib/types'
export const dynamic = 'force-dynamic'

export default async function EventGuestsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const eventId = Number((await params).id)
  if (!Number.isInteger(eventId) || eventId < 1) notFound()
  const event = (
    await sql<
      { id: number; name: string }[]
    >`SELECT id,name FROM events WHERE id=${eventId} LIMIT 1`
  )[0]
  if (!event) notFound()
  const rows = await sql<
    {
      id: number
      name: string
      delegation_wg: string | null
      registered: boolean
      status: GuestStatus | null
    }[]
  >`
    SELECT g.id,g.name,g.delegation_wg,(eg.guest_id IS NOT NULL) AS registered,eg.status
    FROM guests g
    LEFT JOIN event_guests eg ON eg.guest_id=g.id AND eg.event_id=${eventId}
    ORDER BY (eg.guest_id IS NULL),g.name
  `
  return (
    <>
      <div className="page-head">
        <div>
          <h1>{event.name}: registrations</h1>
          {/* <p>Choose which persistent guest badges are valid for this event. Registering a guest does not change their QR code.</p> */}
        </div>
        <div className="actions">
          <Link className="btn secondary" href="/guests">
            Guest directory
          </Link>
          <Link className="btn accent" href={`/scanner?event=${event.id}`}>
            Scanner
          </Link>
        </div>
      </div>
      <EventGuestManager eventId={event.id} rows={rows} />
    </>
  )
=======
import Link from "next/link";
import { notFound } from "next/navigation";
import EventGuestManager from "@/components/EventGuestManager";
import { sql } from "@/lib/db";
import type { GuestStatus } from "@/lib/types";
import type { RoleCode } from "@/lib/roles";
import { autoCheckoutExpiredEvents } from "@/lib/events";
export const dynamic="force-dynamic";

export default async function EventGuestsPage({params}:{params:Promise<{id:string}>}){
  await autoCheckoutExpiredEvents();
  const eventId=Number((await params).id);
  if(!Number.isInteger(eventId)||eventId<1) notFound();
  const event=(await sql<{id:number;name:string}[]>`SELECT id,name FROM events WHERE id=${eventId} LIMIT 1`)[0];
  if(!event) notFound();
  const rows=await sql<{id:number;name:string;region:string|null;registered:boolean;status:GuestStatus|null;roles:RoleCode[]}[]>`
    SELECT g.id,g.name,g.region,(eg.guest_id IS NOT NULL) AS registered,eg.status,
           COALESCE(json_agg(gr.role_code ORDER BY gr.position) FILTER (WHERE gr.role_code IS NOT NULL),'[]'::json) AS roles
    FROM guests g
    LEFT JOIN event_guests eg ON eg.guest_id=g.id AND eg.event_id=${eventId}
    LEFT JOIN guest_roles gr ON gr.guest_id=g.id
    GROUP BY g.id,g.name,g.region,eg.guest_id,eg.status
    ORDER BY (eg.guest_id IS NULL),g.name
  `;
  return <>
    <div className="page-head"><div><h1>{event.name}: registrations</h1><p>Choose which persistent guest badges are valid for this event. Registering a guest does not change their QR code.</p></div><div className="actions"><Link className="btn secondary" href="/guests">Guest directory</Link><Link className="btn accent" href={`/scanner?event=${event.id}`}>Scanner</Link></div></div>
    <EventGuestManager eventId={event.id} rows={rows}/>
  </>;
>>>>>>> 50ba541 (Updated project)
}
