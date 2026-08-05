import { redirect } from "next/navigation";

import { resolveAdminRouteAccess } from "../../lib/route-access";
import { readServerIdentity } from "../../lib/server-route-access";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const adminIdentity = await readServerIdentity("/api/admin-me.php");

  if (adminIdentity?.success === true && adminIdentity.is_admin === true) {
    return children;
  }

  const userIdentity = await readServerIdentity("/api/me.php");
  const resolution = resolveAdminRouteAccess(adminIdentity, userIdentity);

  if (resolution === "login") redirect("/login?returnTo=%2Fadmin");
  if (resolution === "home") redirect("/");

  return children;
}
