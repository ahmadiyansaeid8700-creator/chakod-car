"use client";

import { useEffect } from "react";

export default function WalletChargeReturnFix() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("type") !== "wallet_charge") return;

    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("header a"));
    const backLink = links.find((link) => {
      try {
        return new URL(link.href, window.location.origin).pathname === "/account/payments";
      } catch {
        return false;
      }
    });

    if (!backLink) return;
    backLink.href = "/account/wallet";
    backLink.textContent = "بازگشت به کیف پول";
    backLink.setAttribute("aria-label", "بازگشت به کیف پول");
  }, []);

  return null;
}
