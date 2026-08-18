"use client";

import { useEffect } from "react";

function sessionHeaders(): Record<string, string> {
  const token = localStorage.getItem("chakod_session_token") || "";
  return token ? { Authorization: `Bearer ${token}`, "X-Session-Token": token } : {};
}

function requestUrl(input: RequestInfo | URL) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit) {
  if (init?.method) return init.method.toUpperCase();
  return input instanceof Request ? input.method.toUpperCase() : "GET";
}

function parseSubmitBody(input: RequestInfo | URL, init?: RequestInit) {
  if (typeof init?.body !== "string") return null;
  try {
    const value: unknown = JSON.parse(init.body);
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

export default function ListingAttributionBridge() {
  useEffect(() => {
    const nativeFetch = window.fetch.bind(window);

    const bridgedFetch: typeof window.fetch = async (input, init) => {
      const response = await nativeFetch(input, init);

      try {
        const url = requestUrl(input);
        const isListingSubmit = /https:\/\/api\.chakod\.com\/api\/submit-listing\.php(?:\?|$)/i.test(url);
        if (!isListingSubmit || requestMethod(input, init) !== "POST" || !response.ok) return response;

        const payload = await response.clone().json().catch(() => null) as {
          success?: boolean;
          listing_id?: number | string;
        } | null;
        const listingId = Math.round(Number(payload?.listing_id || 0));
        if (!payload?.success || !Number.isSafeInteger(listingId) || listingId <= 0) return response;

        const submitted = parseSubmitBody(input, init);
        void nativeFetch("/api/auth/listing-attribution", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          keepalive: true,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...sessionHeaders(),
          },
          body: JSON.stringify({
            listing_id: listingId,
            dealer_id: Number(submitted?.dealer_id || 0) || null,
          }),
        }).catch(() => undefined);
      } catch {
        // انتساب ثبت‌کننده نباید جریان اصلی ثبت آگهی را متوقف کند.
      }

      return response;
    };

    window.fetch = bridgedFetch;
    return () => {
      if (window.fetch === bridgedFetch) window.fetch = nativeFetch;
    };
  }, []);

  return null;
}
