export type ActiveAccountSelection =
  | { kind: "personal" }
  | {
      kind: "activity";
      id: number;
      type: string;
      name: string;
      external_dealer_id?: number | null;
      logo_url?: string | null;
    }
  | {
      kind: "membership";
      type: string;
      name: string;
      external_dealer_id: number;
      role?: string;
      logo_url?: string | null;
    };

export const ACTIVE_ACCOUNT_STORAGE_KEY = "chakod_active_account";
export const ACTIVE_ACCOUNT_EVENT = "chakod:active-account-changed";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function readActiveAccount(): ActiveAccountSelection {
  if (typeof window === "undefined") return { kind: "personal" };

  try {
    const raw = localStorage.getItem(ACTIVE_ACCOUNT_STORAGE_KEY);
    if (!raw) return { kind: "personal" };
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return { kind: "personal" };

    if (parsed.kind === "personal") return { kind: "personal" };

    if (parsed.kind === "activity") {
      const id = Math.round(Number(parsed.id || 0));
      const type = typeof parsed.type === "string" ? parsed.type.trim() : "";
      const name = typeof parsed.name === "string" ? parsed.name.trim() : "";
      if (id > 0 && type && name) {
        return {
          kind: "activity",
          id,
          type,
          name,
          external_dealer_id: Number(parsed.external_dealer_id || 0) || null,
          logo_url: typeof parsed.logo_url === "string" ? parsed.logo_url : null,
        };
      }
    }

    if (parsed.kind === "membership") {
      const externalDealerId = Math.round(Number(parsed.external_dealer_id || 0));
      const type = typeof parsed.type === "string" ? parsed.type.trim() : "";
      const name = typeof parsed.name === "string" ? parsed.name.trim() : "";
      if (externalDealerId > 0 && type && name) {
        return {
          kind: "membership",
          type,
          name,
          external_dealer_id: externalDealerId,
          role: typeof parsed.role === "string" ? parsed.role : undefined,
          logo_url: typeof parsed.logo_url === "string" ? parsed.logo_url : null,
        };
      }
    }
  } catch {
    // Ignore malformed local state and fall back to the personal account.
  }

  return { kind: "personal" };
}

export function saveActiveAccount(selection: ActiveAccountSelection) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_ACCOUNT_STORAGE_KEY, JSON.stringify(selection));
  window.dispatchEvent(new CustomEvent<ActiveAccountSelection>(ACTIVE_ACCOUNT_EVENT, { detail: selection }));
}

export function clearActiveAccount() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACTIVE_ACCOUNT_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent<ActiveAccountSelection>(ACTIVE_ACCOUNT_EVENT, { detail: { kind: "personal" } }));
}
