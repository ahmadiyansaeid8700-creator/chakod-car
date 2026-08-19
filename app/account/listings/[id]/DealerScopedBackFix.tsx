"use client";

import { useEffect } from "react";

type ListingLike = {
  id?: number;
  dealer_id?: number | null;
  listing_owner_type?: string | null;
};

type ManagerPayload = {
  success?: boolean;
  listing?: ListingLike;
  data?: ListingLike[];
};

function safeDealerId(value: unknown) {
  const id = Math.round(Number(value || 0));
  return Number.isSafeInteger(id) && id > 0 ? id : 0;
}

export default function DealerScopedBackFix({ listingId }: { listingId: string }) {
  useEffect(() => {
    let cancelled = false;
    let scopedHref = "";

    function updateLinks() {
      if (!scopedHref) return;
      document
        .querySelectorAll<HTMLAnchorElement>('a[href="/account/listings"]')
        .forEach((anchor) => anchor.setAttribute("href", scopedHref));
    }

    function handleClick(event: MouseEvent) {
      if (!scopedHref || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a") : null;
      if (!target) return;
      const href = target.getAttribute("href") || "";
      if (href !== "/account/listings" && !href.startsWith("/account/listings?")) return;
      event.preventDefault();
      window.location.assign(scopedHref);
    }

    document.addEventListener("click", handleClick, true);

    async function resolveDealerScope() {
      try {
        const response = await fetch(`/api/auth/listings/manage/${encodeURIComponent(listingId)}`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        const payload = (await response.json().catch(() => null)) as ManagerPayload | null;
        if (cancelled || !response.ok || !payload?.success) return;

        const listing =
          payload.listing ||
          (Array.isArray(payload.data)
            ? payload.data.find((item) => String(item.id || "") === listingId) || payload.data[0]
            : undefined);
        const dealerId = safeDealerId(listing?.dealer_id);
        if (!dealerId || listing?.listing_owner_type === "personal") return;

        scopedHref = `/account/listings?dealer_id=${encodeURIComponent(String(dealerId))}`;
        updateLinks();
      } catch {
        // Keep the existing generic back link if dealer scope cannot be resolved.
      }
    }

    void resolveDealerScope();

    return () => {
      cancelled = true;
      document.removeEventListener("click", handleClick, true);
    };
  }, [listingId]);

  return null;
}
