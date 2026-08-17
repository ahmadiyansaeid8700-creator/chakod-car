"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useParams } from "next/navigation";

import BusinessWalletCard from "../../../account/components/BusinessWalletCard";

type ActivityResponse = {
  success?: boolean;
  activity?: {
    id: number;
    type: string;
    name: string;
    access_role?: string;
  } | null;
};

async function readJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  try {
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}

export default function BusinessWalletCardInjector() {
  const params = useParams<{ id: string }>();
  const activityId = Math.max(0, Math.round(Number(params?.id || 0)));
  const [activity, setActivity] = useState<{ id: number; type: string; name: string; role: string } | null>(null);
  const [mount, setMount] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!activityId) return;
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(`/api/auth/account-activities/${activityId}`, {
          cache: "no-store",
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        const payload = await readJson<ActivityResponse>(response);
        if (!cancelled && response.ok && payload?.success && payload.activity) {
          setActivity({
            id: payload.activity.id,
            type: payload.activity.type,
            name: payload.activity.name || "کسب‌وکار",
            role: payload.activity.access_role || "viewer",
          });
        }
      } catch {
        if (!cancelled) setActivity(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activityId]);

  useEffect(() => {
    let currentMount: HTMLElement | null = null;

    function ensureMount() {
      const statusGrid = document.querySelector<HTMLElement>('section[aria-label="وضعیت مجموعه"]');
      if (!statusGrid) {
        currentMount?.remove();
        currentMount = null;
        setMount(null);
        return;
      }

      if (currentMount?.isConnected && currentMount.previousElementSibling === statusGrid) return;
      currentMount?.remove();
      currentMount = document.createElement("div");
      currentMount.dataset.businessWalletCard = "true";
      statusGrid.insertAdjacentElement("afterend", currentMount);
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
  }, [activityId]);

  if (!mount || !activity) return null;

  return createPortal(
    <div style={{ margin: "14px 0" }}>
      <BusinessWalletCard
        accountName={activity.name}
        accountType={activity.type}
        activityId={activity.id}
        role={activity.role}
      />
    </div>,
    mount,
  );
}
