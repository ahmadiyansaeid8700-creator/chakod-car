import { redirect } from "next/navigation";

import { hasAdminRouteAccess } from "../../lib/route-access";
import { readServerIdentity } from "../../lib/server-route-access";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const identity = await readServerIdentity("/api/admin-me.php");

  if (!hasAdminRouteAccess(identity)) redirect("/");

  return children;
}
