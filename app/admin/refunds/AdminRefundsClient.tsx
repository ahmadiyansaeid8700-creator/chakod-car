"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import styles from "./page.module.css";

type Refund = {
  id: number;
  order_id: number;
  payment_attempt_id: number;
  amount_toman: number;
  destination: string;
  status: string;
  reason: string;
  admin_note?: string;
  created_at: string;
  updated_at: string;
  order_no?: string | null;
  order_status?: string | null;
  paid_amount_toman?: number | null;
  payment_gateway?: string | null;
  authority?: string | null;
  gateway_transaction_id?: string | null;
};

type ResponsePayload = {
  success?: boolean;
  message?: string;
  pending?: boolean;
  gateway_refund_ready?: boolean;
  refunds?: Refund[];
};

const statusLabels: Record<string, string> = {
  requested: "درخواست شده",
  approved: "تایید شده",
  processing: "در حال اجرا",
  refunded: "بازپرداخت شده",
  rejected: "رد شده",
  cancelled: "لغو شده",
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

export default function AdminRefundsClient() {
  const [data, setData] = useState<ResponsePayload | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/refunds/manage", {
        cache: "no-store",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const payload = await readJson<ResponsePayload>(response);
      if (response.status === 401 || response.status === 403) {
        window.location.assign("/admin/login?returnTo=/admin/refunds");
        return;
      }
      if (!response.ok || !payload?.success) {
        setError(payload?.message || "فهرست بازپرداخت ها دریافت نشد.");
        return;
      }
      setData(payload);
      const rows = payload.refunds || [];
      setNotes(Object.fromEntries(rows.map((item) => [item.id, item.admin_note || ""])));
    } catch {
      setError("ارتباط با سرویس مدیریت بازپرداخت برقرار نشد.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(() => {
    const rows = data?.refunds || [];
    return filter === "all" ? rows : rows.filter((item) => item.status === filter);
  }, [data?.refunds, filter]);

  const requested = (data?.refunds || []).filter((item) => item.status === "requested").length;
  const approved = (data?.refunds || []).filter((item) => ["approved", "processing"].includes(item.status)).length;
  const completed = (data?.refunds || []).filter((item) => item.status === "refunded").length;

  async function run(item: Refund, action: "approve" | "reject" | "execute") {
    if (workingId) return;
    if (action === "execute" && item.destination === "gateway" && data?.gateway_refund_ready !== true) {
      setError("Adapter بازپرداخت بانکی هنوز در Environment فعال نشده است.");
      return;
    }
    if (action === "reject" && !window.confirm("این درخواست بازپرداخت رد شود؟")) return;
    if (action === "execute" && !window.confirm(`بازپرداخت ${formatToman(item.amount_toman)} اجرا شود؟`)) return;

    setWorkingId(item.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/refunds/manage", {
        method: "POST",
        cache: "no-store",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refund_id: item.id,
          action,
          admin_note: notes[item.id] || "",
        }),
      });
      const payload = await readJson<ResponsePayload>(response);
      if (response.status === 202 && payload?.pending) {
        setNotice(payload.message || "بازپرداخت در حال پیگیری است.");
        await load();
        return;
      }
      if (!response.ok || !payload?.success) {
        setError(payload?.message || "عملیات بازپرداخت انجام نشد.");
        return;
      }
      setNotice(payload.message || "وضعیت بازپرداخت به روز شد.");
      await load();
    } catch {
      setError("ارتباط با سرور هنگام عملیات بازپرداخت قطع شد.");
    } finally {
      setWorkingId(0);
    }
  }

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <Link href="/admin">← مدیریت</Link>
            <span>CHAKOD REFUNDS</span>
            <h1>مدیریت بازپرداخت</h1>
            <p>درخواست کاربر را بررسی کنید، سپس تایید/رد و در مرحله بعد بازپرداخت واقعی به کیف پول یا درگاه را اجرا کنید.</p>
          </div>
          <button type="button" onClick={() => void load()}>به روزرسانی</button>
        </header>

        <section className={styles.stats}>
          <article><span>درخواست جدید</span><strong>{new Intl.NumberFormat("fa-IR").format(requested)}</strong></article>
          <article><span>آماده اجرا</span><strong>{new Intl.NumberFormat("fa-IR").format(approved)}</strong></article>
          <article><span>انجام شده</span><strong>{new Intl.NumberFormat("fa-IR").format(completed)}</strong></article>
        </section>

        {data?.gateway_refund_ready === false && (
          <div className={styles.gatewayWarning}>بازپرداخت به کیف پول قابل اجرا است؛ Adapter بازپرداخت بانکی هنوز در Environment تنظیم نشده است.</div>
        )}

        <nav className={styles.filters}>
          {[
            ["all", "همه"],
            ["requested", "درخواست شده"],
            ["approved", "تایید شده"],
            ["processing", "در حال اجرا"],
            ["refunded", "بازپرداخت شده"],
            ["rejected", "رد شده"],
          ].map(([value, label]) => (
            <button key={value} className={filter === value ? styles.active : ""} onClick={() => setFilter(value)}>{label}</button>
          ))}
        </nav>

        {error && <div className={styles.error}>{error}</div>}
        {notice && <div className={styles.notice}>{notice}</div>}

        {loading ? (
          <section className={styles.state}><span className={styles.loader}/><h2>در حال دریافت درخواست ها</h2></section>
        ) : visible.length ? (
          <section className={styles.list}>
            {visible.map((item) => (
              <article className={styles.card} key={item.id}>
                <div className={styles.cardHead}>
                  <div>
                    <span>بازپرداخت #{new Intl.NumberFormat("fa-IR").format(item.id)}</span>
                    <h2>{item.order_no || `سفارش ${item.order_id}`}</h2>
                    <p>{item.reason}</p>
                  </div>
                  <div className={styles.statusBox}>
                    <b>{statusLabels[item.status] || item.status}</b>
                    <small>{item.destination === "wallet" ? "به کیف پول" : "به درگاه بانکی"}</small>
                  </div>
                </div>

                <div className={styles.meta}>
                  <div><small>مبلغ درخواست</small><strong>{formatToman(item.amount_toman)}</strong></div>
                  <div><small>کل پرداخت سفارش</small><strong>{formatToman(item.paid_amount_toman)}</strong></div>
                  <div><small>روش پرداخت</small><strong>{item.payment_gateway === "wallet" ? "کیف پول" : item.payment_gateway || "درگاه"}</strong></div>
                  <div><small>وضعیت سفارش</small><strong>{item.order_status || "—"}</strong></div>
                </div>

                <label className={styles.noteField}>
                  یادداشت مدیر مالی
                  <textarea value={notes[item.id] || ""} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} maxLength={500} />
                </label>

                <div className={styles.actions}>
                  {item.status === "requested" && (
                    <button className={styles.approve} disabled={workingId === item.id} onClick={() => void run(item, "approve")}>تایید درخواست</button>
                  )}
                  {["requested", "approved"].includes(item.status) && (
                    <button className={styles.reject} disabled={workingId === item.id} onClick={() => void run(item, "reject")}>رد درخواست</button>
                  )}
                  {["approved", "processing"].includes(item.status) && (
                    <button className={styles.execute} disabled={workingId === item.id || (item.destination === "gateway" && data?.gateway_refund_ready !== true)} onClick={() => void run(item, "execute")}>اجرای بازپرداخت</button>
                  )}
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className={styles.state}><span>⌁</span><h2>درخواستی در این وضعیت وجود ندارد</h2></section>
        )}
      </div>
    </main>
  );
}
