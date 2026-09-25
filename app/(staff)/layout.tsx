import Nav from "@/components/Nav";
import { requireStaff } from "@/lib/auth";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  await requireStaff();
  return <div className="shell"><Nav /><main className="main">{children}</main></div>;
}
