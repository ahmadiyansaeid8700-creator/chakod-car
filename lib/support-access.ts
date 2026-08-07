function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function createSupportAccessToken() {
  return `${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().replace(/-/g, "")}`;
}

export async function hashSupportAccess(value: string) {
  const payload = new TextEncoder().encode(`chakod-support:${value}`);
  const digest = await crypto.subtle.digest("SHA-256", payload);
  return bytesToHex(new Uint8Array(digest));
}

export function validSupportTicketNo(value: string) {
  return /^SUP-[A-Z0-9-]{10,80}$/i.test(value);
}
