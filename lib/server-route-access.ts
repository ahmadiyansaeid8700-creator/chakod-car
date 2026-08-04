import { cookies } from "next/headers";

import {
  authApiUrl,
  CHAKOD_SESSION_COOKIE,
  parseJsonResponse,
} from "./chakod-auth-proxy";

const TOKEN_PATTERN = /^[a-f0-9]{64}$/i;

export async function readServerIdentity(endpoint: "/api/me.php" | "/api/admin-me.php") {
  const cookieStore = await cookies();
  const token = cookieStore.get(CHAKOD_SESSION_COOKIE)?.value?.trim() || "";

  if (!TOKEN_PATTERN.test(token)) return null;

  try {
    const response = await fetch(authApiUrl(endpoint), {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "X-Session-Token": token,
      },
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) return null;
    return await parseJsonResponse(response);
  } catch {
    return null;
  }
}
