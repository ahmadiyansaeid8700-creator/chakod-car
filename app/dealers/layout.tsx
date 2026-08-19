import { redirect } from "next/navigation";

import { hasAuthenticatedRouteAccess } from "../../lib/route-access";
import { readServerIdentity } from "../../lib/server-route-access";

export const dynamic = "force-dynamic";

export default async function DealersLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const identity = await readServerIdentity("/api/me.php");

  if (!hasAuthenticatedRouteAccess(identity)) {
    redirect("/login?returnTo=/dealers");
  }

  return children;
}
