import Link from "next/link";

import styles from "./MarketModeSwitch.module.css";

export default function MarketModeSwitch({ active }: { active: "cars" | "services" }) {
  return <nav className={styles.switcher} aria-label="انتخاب بازار چاکود">
    <Link href="/cars" className={active === "cars" ? styles.activeCars : ""}>
      <span className={styles.icon} aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 15.5h16l-1.4-5A2.1 2.1 0 0 0 16.5 9h-9a2.1 2.1 0 0 0-2.1 1.5l-1.4 5Z"/><path d="M6 15.5v2M18 15.5v2M8 13h.1M16 13h.1"/></svg></span>
      <span><small>خرید و فروش</small><strong>بازار خودرو چاکود</strong><em>آگهی‌های تأییدشده را ببین</em></span><b aria-hidden="true">{active === "cars" ? "↓" : "←"}</b>
    </Link>
    <span className={styles.swapHint} aria-hidden="true">↔</span>
    <Link href="/services" className={active === "services" ? styles.activeServices : ""}>
      <span className={styles.icon} aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M14.8 5.1a4.2 4.2 0 0 0-5.3 5.2L4.2 15.7 8.3 20l5.4-5.4a4.2 4.2 0 0 0 5.2-5.3L16.2 12l-3.1-3.1 2.7-2.8Z"/></svg></span>
      <span><small>تعمیر، قطعه و نگهداری</small><strong>بازار خدمات چاکود</strong><em>متخصص نزدیکت را پیدا کن</em></span><b aria-hidden="true">{active === "services" ? "↓" : "→"}</b>
    </Link>
  </nav>;
}
