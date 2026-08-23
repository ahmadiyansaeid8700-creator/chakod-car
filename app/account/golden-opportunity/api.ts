const API_BASE = "https://api.chakod.com";

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("chakod_session_token") || "";
}

export async function getMyGoldenOpportunityListings() {
  const token = getToken();

  return fetch(`${API_BASE}/api/golden-opportunity/listings.php`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Session-Token": token,
      Accept: "application/json",
    },
    cache: "no-store",
  });
}

export async function getGoldenOpportunitySlots(province?: string) {
  const token = getToken();
  const query = province ? `?province=${encodeURIComponent(province)}` : "";

  return fetch(`${API_BASE}/api/golden-opportunity/slots.php${query}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Session-Token": token,
      Accept: "application/json",
    },
    cache: "no-store",
  });
}
