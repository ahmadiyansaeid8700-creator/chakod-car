import { cookies, headers } from "next/headers";

import {
  authApiUrl,
  CHAKOD_SESSION_COOKIE,
  parseJsonResponse,
} from "./chakod-auth-proxy";
import {
  resolveLocalDevelopmentIdentity,
  type ServerIdentityEndpoint,
} from "./local-development-session";

const TOKEN_PATTERN = /^[a-f0-9]{64}$/i;

export async function readServerIdentity(endpoint: ServerIdentityEndpoint) {
  const cookieStore = await cookies();
  const token = cookieStore.get(CHAKOD_SESSION_COOKIE)?.value?.trim() || "";
  const headerStore = await headers();

  const localDevelopmentIdentity = resolveLocalDevelopmentIdentity({
    nodeEnv: process.env.NODE_ENV,
    hostname: headerStore.get("host") || "",
    token,
    endpoint,
  });
  if (localDevelopmentIdentity) return localDevelopmentIdentity;

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
