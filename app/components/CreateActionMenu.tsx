"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

type Props = {
  triggerClassName: string;
  iconClassName: string;
  titleClassName: string;
  icon: ReactNode;
};

type ActionId = "story" | "featured" | "listing";

type Action = {
  id: ActionId;
  title: string;
  description: string;
  href: string;
};

const actions: Action[] = [
  { id: "story", title: "استوری تبلیغاتی", description: "آگهی واقعی یا ویترین منتخب", href: "/advertising/stories" },
  { id: "featured", title: "رزرو منتخب", description: "نمایشگاه، تعمیرگاه، یدکی یا خدمات", href: "/advertising/selected" },
  { id: "listing", title: "ثبت آگهی", description: "ثبت آگهی جدید خودرو", href: "/account/listings/new" },
];

const menuStyle: CSSProperties = {
  position: "absolute",
  left: "50%",
  bottom: "calc(100% + 18px)",
  zIndex: 20,
  width: "min(292px, calc(100vw - 28px))",
  padding: 9,
  border: "1px solid rgba(110,72,144,.14)",
  borderRadius: 22,
  direction: "rtl",
  background: "rgba(255,255,255,.98)",
  boxShadow: "0 22px 54px rgba(48,24,72,.22), 0 4px 14px rgba(48,24,72,.08)",
  backdropFilter: "blur(22px) saturate(145%)",
  transform: "translateX(-50%)",
};

const rowStyle: CSSProperties = {
  minHeight: 58,
  display: "grid",
  gridTemplateColumns: "42px minmax(0,1fr) 18px",
  alignItems: "center",
  gap: 9,
  marginTop: 6,
  padding: "7px 9px",
  border: "1px solid #eee7f3",
  borderRadius: 15,
  color: "#342140",
  background: "#fff",
  textDecoration: "none",
};

const iconLooks: Record<ActionId, CSSProperties> = {
  story: { color: "#7c3aed", background: "#f2eaff" },
  featured: { color: "#a7670a", background: "#fff5dc" },
  listing: { color: "#08755a", background: "#e9f8f2" },
};

function ActionIcon({ id }: { id: ActionId }) {
  const svgStyle: CSSProperties = { width: 21, height: 21, fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" };
  if (id === "story") return <svg viewBox="0 0 24 24" aria-hidden="true" style={svgStyle}><rect x="5" y="3.5" width="14" height="17" rx="4"/><path d="m10 9 5 3-5 3V9Z"/></svg>;
  if (id === "featured") return <svg viewBox="0 0 24 24" aria-hidden="true" style={svgStyle}><path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.9L12 3Z"/></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true" style={svgStyle}><path d="M12 5v14M5 12h14"/></svg>;
}

export default function CreateActionMenu({ triggerClassName, iconClassName, titleClassName, icon }: Props) {
  const pathname = usePathname();
  const hostRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && !hostRef.current?.contains(target)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={hostRef} style={{ position: "relative", zIndex: 6, minWidth: 0, height: "100%" }}>
      {open ? (
        <div style={menuStyle} role="menu" aria-label="اقدام جدید">
          <div style={{ display: "grid", gap: 3, padding: "5px 7px 9px" }}>
            <strong style={{ color: "#2e1c3c", fontSize: 12, fontWeight: 950 }}>چه کاری می‌خواهید انجام دهید؟</strong>
            <span style={{ color: "#8c7d96", fontSize: 9, lineHeight: 1.6 }}>تبلیغ و ثبت محتوا از یک مسیر کنترل می‌شود</span>
          </div>
          {actions.map((action) => (
            <Link key={action.id} href={action.href} role="menuitem" style={rowStyle} onClick={() => setOpen(false)}>
              <span style={{ width: 40, height: 40, display: "grid", placeItems: "center", borderRadius: 12, ...iconLooks[action.id] }}><ActionIcon id={action.id}/></span>
              <span style={{ minWidth: 0, display: "grid", gap: 2 }}>
                <strong style={{ color: "#352044", fontSize: 12, fontWeight: 950 }}>{action.title}</strong>
                <small style={{ overflow: "hidden", color: "#8b7d94", fontSize: 9, lineHeight: 1.5, whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{action.description}</small>
              </span>
              <span style={{ color: "#9a8da3", fontSize: 15, fontWeight: 900 }} aria-hidden="true">←</span>
            </Link>
          ))}
        </div>
      ) : null}

      <button type="button" className={triggerClassName} style={{ width: "100%", height: "100%" }} aria-label={open ? "بستن منوی ثبت و تبلیغ" : "باز کردن منوی ثبت و تبلیغ"} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        <span className={iconClassName} style={open ? { transform: "rotate(45deg)" } : undefined}>{icon}</span>
        <span className={titleClassName}>ثبت آگهی</span>
      </button>
    </div>
  );
}
