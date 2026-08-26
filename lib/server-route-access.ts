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
import { resolveStagingDemoIdentity } from "./staging-demo-session";

const TOKEN_PATTERN = /^[a-f0-9]{64}$/i;

function headerToken(headerStore: Awaited<ReturnType<typeof headers>>) {
  const authorization = headerStore.get("authorization") || "";
  const bearerMatch = authorization.match(/^\s*Bearer\s+([^\s]+)\s*$/i);
  const bearerToken = bearerMatch?.[1]?.trim() || "";
  if (TOKEN_PATTERN.test(bearerToken)) return bearerToken;

  const legacyToken =
    headerStore.get("x-session-token") ||
    headerStore.get("x-auth-token") ||
    headerStore.get("chakod-session-token") ||
    "";

  return TOKEN_PATTERN.test(legacyToken.trim()) ? legacyToken.trim() : "";
}

export async function readServerIdentity(endpoint: ServerIdentityEndpoint) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const cookieToken = cookieStore.get(CHAKOD_SESSION_COOKIE)?.value?.trim() || "";
  const token = TOKEN_PATTERN.test(cookieToken) ? cookieToken : headerToken(headerStore);
  const hostname = headerStore.get("host") || "";

  const localDevelopmentIdentity = resolveLocalDevelopmentIdentity({
    nodeEnv: process.env.NODE_ENV,
    hostname,
    token,
    endpoint,
  });
  if (localDevelopmentIdentity) return localDevelopmentIdentity;

  const stagingDemoIdentity = resolveStagingDemoIdentity({ hostname, token, endpoint });
  if (stagingDemoIdentity) return stagingDemoIdentity;

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
