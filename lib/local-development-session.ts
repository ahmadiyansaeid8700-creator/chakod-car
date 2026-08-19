export type ServerIdentityEndpoint = "/api/me.php" | "/api/admin-me.php";

export const LOCAL_DEVELOPMENT_SESSION_TOKEN = "c".repeat(64);

function normalizeHostname(value: string): string {
  const hostname = value.trim().toLowerCase();
  if (!hostname) return "";

  if (hostname.startsWith("[")) {
    const closingBracket = hostname.indexOf("]");
    return closingBracket > 0 ? hostname.slice(1, closingBracket) : hostname;
  }

  return hostname.split(":", 1)[0] || "";
}

export function isLocalDevelopmentHost(value: string): boolean {
  const hostname = normalizeHostname(value);
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function resolveLocalDevelopmentIdentity(input: {
  nodeEnv: string | undefined;
  hostname: string;
  token: string;
  endpoint: ServerIdentityEndpoint;
}) {
  if (input.nodeEnv !== "development") return null;
  if (!isLocalDevelopmentHost(input.hostname)) return null;
  if (input.token !== LOCAL_DEVELOPMENT_SESSION_TOKEN) return null;

  if (input.endpoint === "/api/admin-me.php") {
    return {
      success: false,
      logged_in: true,
      is_admin: false,
      local_development: true,
    };
  }

  return {
    success: true,
    logged_in: true,
    is_admin: false,
    local_development: true,
    user: {
      id: 0,
      mobile: "09120000000",
      display_name: "کاربر آزمایشی چاکود",
      account_type: "personal",
    },
  };
}
