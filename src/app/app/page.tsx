import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";

export default async function AppIndex() {
  const me = await currentUser();
  redirect(me?.session.role === "admin" ? "/app/admin" : "/app/iniciar");
}
