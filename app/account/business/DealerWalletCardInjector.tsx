"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";

import BusinessWalletCard from "../components/BusinessWalletCard";

type DealerResponse = {
  success?: boolean;
  role?: string;
  dealer?: {
    id: number;
    name: string;
  };
};

function authHeaders(): Record<string, string> {
  const token = typeof window === "undefined" ? "" : localStorage.getItem("chakod_session_token") || "";
  return token ? { Authorization: `Bearer ${token}`, "X-Session-Token": token } : {};
}

async function readJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  try {
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}

export default function DealerWalletCardInjector() {
  const searchParams = useSearchParams();
  const requestedDealerId = Math.max(0, Math.round(Number(searchParams.get("dealer_id") || 0)));
  const activeTab = searchParams.get("tab") || "overview";
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [dealer, setDealer] = useState<{ id: number; name: string; role: string } | null>(null);

  useEffect(() => {
    if (activeTab !== "overview") {
      setDealer(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const query = requestedDealerId ? `?dealer_id=${requestedDealerId}` : "";
        const response = await fetch(`/api/auth/dealer-command-center${query}`, {
          cache: "no-store",
          credentials: "include",
          headers: { Accept: "application/json", ...authHeaders() },
        });
        const payload = await readJson<DealerResponse>(response);
        if (!cancelled && response.ok && payload?.success && payload.dealer?.id) {
          setDealer({
            id: payload.dealer.id,
            name: payload.dealer.name || "نمایشگاه",
            role: payload.role || "viewer",
          });
        }
      } catch {
        if (!cancelled) setDealer(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeTab, requestedDealerId]);

  useEffect(() => {
    if (activeTab !== "overview") {
      setMount(null);
      return;
    }

    let currentMount: HTMLElement | null = null;

    function ensureMount() {
      const stats = document.querySelector<HTMLElement>('section[aria-label="آمار نمایشگاه"]');
      if (!stats) {
        currentMount?.remove();
        currentMount = null;
        setMount(null);
        return;
      }

      if (currentMount?.isConnected && currentMount.previousElementSibling === stats) return;
      currentMount?.remove();
      currentMount = document.createElement("div");
      currentMount.dataset.dealerWalletCard = "true";
      stats.insertAdjacentElement("afterend", currentMount);
      setMount(currentMount);
    }

    ensureMount();
    const observer = new MutationObserver(ensureMount);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      currentMount?.remove();
      setMount(null);
    };
  }, [activeTab]);

  if (!mount || !dealer) return null;

  return createPortal(
    <div style={{ margin: "14px 0" }}>
      <BusinessWalletCard
        accountName={dealer.name}
        accountType="dealer"
        externalDealerId={dealer.id}
        role={dealer.role}
      />
    </div>,
    mount,
  );
}
