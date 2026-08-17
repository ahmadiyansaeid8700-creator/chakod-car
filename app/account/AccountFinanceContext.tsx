"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import {
  ACTIVE_ACCOUNT_EVENT,
  type ActiveAccountSelection,
  activeAccountLabel,
  readActiveAccount,
  syncActiveAccountFinanceScope,
} from "../lib/active-account";
import styles from "./AccountFinanceContext.module.css";

const FINANCE_PREFIXES = [
  "/account/wallet",
  "/account/payments",
  "/account/invoices",
  "/account/promotions",
  "/account/subscriptions",
];

export default function AccountFinanceContext() {
  const pathname = usePathname();
  const [selection, setSelection] = useState<ActiveAccountSelection>({ kind: "personal" });

  useEffect(() => {
    const current = readActiveAccount();
    setSelection(current);
    syncActiveAccountFinanceScope(current);

    const handleChange = (event: Event) => {
      const custom = event as CustomEvent<ActiveAccountSelection>;
      const next = custom.detail || readActiveAccount();
      setSelection(next);
      syncActiveAccountFinanceScope(next);
    };

    window.addEventListener(ACTIVE_ACCOUNT_EVENT, handleChange);
    return () => window.removeEventListener(ACTIVE_ACCOUNT_EVENT, handleChange);
  }, []);

  const financePage = FINANCE_PREFIXES.some((prefix) => pathname?.startsWith(prefix));
  if (!financePage) return null;

  return (
    <aside className={styles.bar} dir="rtl" aria-label="حساب مالی فعال">
      <span>کیف پول فعال</span>
      <strong>{activeAccountLabel(selection)}</strong>
      <small>موجودی و تراکنش‌های این حساب مستقل از سایر حساب‌هاست.</small>
    </aside>
  );
}
