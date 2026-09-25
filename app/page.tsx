import { redirect } from "next/navigation";
import { isStaffAuthenticated } from "@/lib/auth";

export default async function Home() {
  redirect((await isStaffAuthenticated()) ? "/dashboard" : "/login");
}
