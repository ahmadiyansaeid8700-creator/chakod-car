export const CHAKOD_PUBLIC_API_ORIGIN = "https://api.chakod.com";
export const CHAKOD_LOCAL_PUBLIC_API_PREFIX = "/chakod-api";

function normalizeHostname(value: string): string {
  const hostname = value.trim().toLowerCase();
  if (!hostname) return "";

  if (hostname.startsWith("[")) {
    const closingBracket = hostname.indexOf("]");
    return closingBracket > 0 ? hostname.slice(1, closingBracket) : hostname;
  }

  return hostname.split(":", 1)[0] || "";
}

export function isLocalPublicApiHost(value: string): boolean {
  const hostname = normalizeHostname(value);
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function shouldUseLocalPublicApiProxy(input: {
  nodeEnv: string | undefined;
  hostname: string;
}): boolean {
  return input.nodeEnv === "development" && isLocalPublicApiHost(input.hostname);
}

export function rewriteLocalPublicApiUrl(input: {
  value: string;
  nodeEnv: string | undefined;
  hostname: string;
}): string {
  if (!shouldUseLocalPublicApiProxy(input)) return input.value;

  try {
    const url = new URL(input.value, `http://${input.hostname || "127.0.0.1"}`);
    if (url.origin !== CHAKOD_PUBLIC_API_ORIGIN) return input.value;

    return `${CHAKOD_LOCAL_PUBLIC_API_PREFIX}${url.pathname}${url.search}${url.hash}`;
  } catch {
    return input.value;
  }
}

export function installLocalPublicApiFetchBridge(input: {
  nodeEnv: string | undefined;
  hostname: string;
  fetchImpl: typeof fetch;
  assignFetch: (nextFetch: typeof fetch) => void;
}): boolean {
  if (!shouldUseLocalPublicApiProxy(input)) return false;

  const originalFetch = input.fetchImpl;
  const bridgedFetch: typeof fetch = (request, init) => {
    if (typeof request === "string") {
      return originalFetch(
        rewriteLocalPublicApiUrl({
          value: request,
          nodeEnv: input.nodeEnv,
          hostname: input.hostname,
        }),
        init,
      );
    }

    if (request instanceof URL) {
      const rewritten = rewriteLocalPublicApiUrl({
        value: request.toString(),
        nodeEnv: input.nodeEnv,
        hostname: input.hostname,
      });

      return originalFetch(
        rewritten === request.toString()
          ? request
          : new URL(rewritten, `http://${input.hostname}`),
        init,
      );
    }

    return originalFetch(request, init);
  };

  input.assignFetch(bridgedFetch);
  return true;
}
