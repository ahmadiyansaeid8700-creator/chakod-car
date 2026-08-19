"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import styles from "./page.module.css";

type Placement = {
  id: number;
  order_id: number;
  dealer_id: number;
  dealer_name: string;
  province: string;
  start_date: string;
  end_date: string;
  reserved_days: number;
  daily_rate_toman: number;
  total_price_toman: number;
  status: string;
  admin_note?: string;
  approved_at?: string | null;
  created_at: string;
  order_no?: string | null;
  order_status?: string | null;
  order_amount_toman?: number | null;
};

type ResponsePayload = {
  success?: boolean;
  message?: string;
  placements?: Placement[];
};

const statusLabels: Record<string, string> = {
  pending_payment: "در انتظار پرداخت",
  payment_failed: "پرداخت ناموفق",
  paid: "پرداخت شده",
  pending_review: "در انتظار تایید",
  approved: "تایید شده",
  scheduled: "زمان بندی شده",
  active: "در حال نمایش",
  expired: "پایان یافته",
  rejected: "رد شده",
  cancelled: "لغو شده",
  refunded: "بازگشت وجه",
};

function formatToman(value: number | null | undefined) {
  return `${new Intl.NumberFormat("fa-IR").format(Number(value || 0))} تومان`;
}

async function readJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  try {
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}

export default function FeaturedShowroomAdminClient() {
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [filter, setFilter] = useState("all");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/featured-showrooms", {
        cache: "no-store",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const payload = await readJson<ResponsePayload>(response);
      if (response.status === 401 || response.status === 403) {
        window.location.assign("/admin/login?returnTo=/admin/featured-showrooms");
        return;
      }
      if (!response.ok || !payload?.success) {
        setError(payload?.message || "فهرست رزروها دریافت نشد.");
        return;
      }
      const rows = Array.isArray(payload.placements) ? payload.placements : [];
      setPlacements(rows);
      setNotes(Object.fromEntries(rows.map((item) => [item.id, item.admin_note || ""])));
    } catch {
      setError("ارتباط با مدیریت نمایشگاه های منتخب برقرار نشد.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(
    () => filter === "all" ? placements : placements.filter((item) => item.status === filter),
    [placements, filter],
  );

  const pendingCount = placements.filter((item) => item.status === "pending_review").length;
  const approvedCount = placements.filter((item) => item.status === "approved").length;

  async function runAction(item: Placement, action: "approve" | "reject" | "cancel") {
    if (workingId) return;
    if (action === "approve" && item.order_status !== "paid") {
      setError("این سفارش هنوز پرداخت نشده است.");
      return;
    }
    if (action !== "approve" && !window.confirm("تغییر وضعیت این جایگاه انجام شود؟")) return;

    setWorkingId(item.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/featured-showrooms", {
        method: "POST",
        cache: "no-store",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          placement_id: item.id,
          action,
          admin_note: notes[item.id] || "",
        }),
      });
      const payload = await readJson<ResponsePayload>(response);
      if (!response.ok || !payload?.success) {
        setError(payload?.message || "تغییر وضعیت انجام نشد.");
        return;
      }
      setNotice(payload.message || "وضعیت به روز شد.");
      await load();
    } catch {
      setError("ارتباط با سرور هنگام تغییر وضعیت قطع شد.");
    } finally {
      setWorkingId(0);
    }
  }

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <Link href="/admin/commerce">← مدیریت تجاری</Link>
            <span>CHAKOD FEATURED SHOWROOMS</span>
            <h1>مدیریت نمایشگاه های منتخب</h1>
            <p>فقط رزرو پرداخت شده را تایید کنید؛ رزرو تایید شده در بازه انتخابی وارد ریل نمایشگاه های منتخب صفحه اول می شود.</p>
          </div>
          <button type="button" onClick={() => void load()}>به روزرسانی</button>
        </header>

        <section className={styles.stats}>
          <article><span>در انتظار تایید</span><strong>{new Intl.NumberFormat("fa-IR").format(pendingCount)}</strong></article>
          <article><span>تایید شده</span><strong>{new Intl.NumberFormat("fa-IR").format(approvedCount)}</strong></article>
          <article><span>کل رزروها</span><strong>{new Intl.NumberFormat("fa-IR").format(placements.length)}</strong></article>
        </section>

        <nav className={styles.filters}>
          {[
            ["all", "همه"],
            ["pending_review", "در انتظار تایید"],
            ["approved", "تایید شده"],
            ["rejected", "رد شده"],
            ["cancelled", "لغو شده"],
          ].map(([value, label]) => (
            <button key={value} className={filter === value ? styles.active : ""} onClick={() => setFilter(value)}>{label}</button>
          ))}
        </nav>

        {error && <div className={styles.error}>{error}</div>}
        {notice && <div className={styles.notice}>{notice}</div>}

        {loading ? (
          <section className={styles.state}><span className={styles.loader}/><h2>در حال دریافت رزروها</h2></section>
        ) : visible.length ? (
          <section className={styles.list}>
            {visible.map((item) => (
              <article className={styles.card} key={item.id}>
                <div className={styles.cardHead}>
                  <div>
                    <span>رزرو #{new Intl.NumberFormat("fa-IR").format(item.id)}</span>
                    <h2>{item.dealer_name}</h2>
                    <p>{item.province} · {item.start_date} تا {item.end_date}</p>
                  </div>
                  <div className={styles.statusBox}>
                    <b>{statusLabels[item.status] || item.status}</b>
                    <small>سفارش: {statusLabels[item.order_status || ""] || item.order_status || "—"}</small>
                  </div>
                </div>

                <div className={styles.meta}>
                  <div><small>شماره سفارش</small><strong dir="ltr">{item.order_no || "—"}</strong></div>
                  <div><small>مدت</small><strong>{new Intl.NumberFormat("fa-IR").format(item.reserved_days)} روز</strong></div>
                  <div><small>تعرفه روزانه</small><strong>{formatToman(item.daily_rate_toman)}</strong></div>
                  <div><small>مبلغ پرداخت</small><strong>{formatToman(item.order_amount_toman || item.total_price_toman)}</strong></div>
                </div>

                <label className={styles.noteField}>
                  یادداشت مدیر
                  <textarea
                    value={notes[item.id] || ""}
                    onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))}
                    maxLength={500}
                    placeholder="علت رد، توضیح تایید یا نکته داخلی..."
                  />
                </label>

                <div className={styles.actions}>
                  {(item.status === "pending_review" || item.status === "rejected") && (
                    <button
                      className={styles.approve}
                      type="button"
                      disabled={workingId === item.id || item.order_status !== "paid"}
                      onClick={() => void runAction(item, "approve")}
                    >
                      تایید نمایشگاه منتخب
                    </button>
                  )}
                  {(item.status === "pending_review" || item.status === "approved") && (
                    <button type="button" disabled={workingId === item.id} onClick={() => void runAction(item, "reject")}>
                      رد رزرو
                    </button>
                  )}
                  {["approved", "scheduled", "active"].includes(item.status) && (
                    <button className={styles.danger} type="button" disabled={workingId === item.id} onClick={() => void runAction(item, "cancel")}>
                      لغو جایگاه
                    </button>
                  )}
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className={styles.state}><span>⌁</span><h2>رزروی در این وضعیت وجود ندارد</h2></section>
        )}
      </div>
    </main>
  );
}
