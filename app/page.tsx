import { redirect } from "next/navigation";
import { isStaffAuthenticated } from "@/lib/auth";

export default async function Home() {
<<<<<<< HEAD
  redirect((await isStaffAuthenticated()) ? "/dashboard" : "/login");
=======
  redirect((await isStaffAuthenticated()) ? "/dashboard" : "/congress");
>>>>>>> 50ba541 (Updated project)
}
