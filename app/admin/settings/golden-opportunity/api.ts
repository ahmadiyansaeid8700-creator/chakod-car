const API_BASE = "https://api.chakod.com";

export type AdminMeResponse = {
  success: boolean;
  is_admin?: boolean;
  message?: string;
  admin?: {
    role?: string;
    permissions?: string[];
    can_manage_settings?: boolean;
  };
};

export async function getAdminMe(token: string) {
  return fetch(`${API_BASE}/api/admin-me.php`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Session-Token": token,
      Accept: "application/json",
    },
    cache: "no-store",
  });
}

export async function getGoldenOpportunitySettings(token: string) {
  return fetch(`${API_BASE}/api/admin/golden-opportunity-settings.php`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Session-Token": token,
      Accept: "application/json",
    },
    cache: "no-store",
  });
}

export async function saveGoldenOpportunitySettings(
  token: string,
  payload: unknown
) {
  return fetch(`${API_BASE}/api/admin/golden-opportunity-settings.php`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Session-Token": token,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });
}
