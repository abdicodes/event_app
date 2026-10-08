import Nav from "@/components/Nav";
<<<<<<< HEAD
=======
import AutoCheckoutHeartbeat from "@/components/AutoCheckoutHeartbeat";
>>>>>>> 50ba541 (Updated project)
import { requireStaff } from "@/lib/auth";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  await requireStaff();
<<<<<<< HEAD
  return <div className="shell"><Nav /><main className="main">{children}</main></div>;
=======
  return <div className="shell"><AutoCheckoutHeartbeat/><Nav /><main className="main">{children}</main></div>;
>>>>>>> 50ba541 (Updated project)
}
