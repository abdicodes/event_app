import Nav from "@/components/Nav";
import AutoCheckoutHeartbeat from "@/components/AutoCheckoutHeartbeat";
import { requireStaff } from "@/lib/auth";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  await requireStaff();
  return <div className="shell"><AutoCheckoutHeartbeat/><Nav /><main className="main">{children}</main></div>;
}
