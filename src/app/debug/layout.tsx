import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";

// Server-side gate: /debug is admin-only. Non-admins (or guests) get bounced
// home before the page renders.
export default async function DebugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!isAdmin(session?.id)) redirect("/");
  return children;
}
