"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import MobileBottomNav from "../../components/MobileBottomNav";
import styles from "./page.module.css";

type RefundRow = {
  id: number;
  order_no: string;
  amount_toman: number;
  destination: string;
  status: string;
  reason: string;
  admin_note?: string;
  created_at: string;
};

type RefundableOrder = {
  order_no: string;
  product_code: string;
  paid_amount_toman: number;
  refundable_amount_toman: number;
  payment_method: "wallet" | "gateway";
  created_at: string;
};

type RefundResponse = {
  success?: boolean;
  message?: string;
  refunds?: RefundRow[];
  refundable_orders?: RefundableOrder[];
};

const statusLabels: Record<string, string> = {
  requested: "ثبت شده",
  approved: "تایید شده",
  processing: "در حال بازپرداخت",
  refunded: "بازپرداخت شده",
  rejected: "رد شده",
  cancelled: "لغو شده",
};

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("chakod_session_token") || "";
  return token
    ? { Authorization: `Bearer ${token}`, "X-Session-Token": token }
    : {};
}

async function readJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  try {
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}

function formatToman(value: number) {
  return `${new Intl.NumberFormat("fa-IR").format(Number(value || 0))} تومان`;
}

export default function RefundCenterClient() {
  const [data, setData] = useState<RefundResponse | null>(null);
  const [orderNo, setOrderNo] = useState("");
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState<"wallet" | "gateway">("gateway");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    const token = localStorage.getItem("chakod_session_token") || "";
    if (!token) {
      window.location.assign(`/login?returnTo=${encodeURIComponent("/account/refunds")}`);
      return;
    }

    try {
      const response = await fetch("/api/finance/refunds", {
        cache: "no-store",
        credentials: "include",
        headers: { Accept: "application/json", ...authHeaders() },
      });
      const payload = await readJson<RefundResponse>(response);
      if (!response.ok || !payload?.success) {
        setError(payload?.message || "اطلاعات بازپرداخت دریافت نشد.");
        return;
      }
      setData(payload);
      if (!orderNo && payload.refundable_orders?.[0]) {
        const first = payload.refundable_orders[0];
        setOrderNo(first.order_no);
        setAmount(String(first.refundable_amount_toman));
        setDestination(first.payment_method === "wallet" ? "wallet" : "gateway");
      }
    } catch {
      setError("ارتباط با سرویس بازپرداخت برقرار نشد.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const selectedOrder = useMemo(
    () => data?.refundable_orders?.find((item) => item.order_no === orderNo) || null,
    [data?.refundable_orders, orderNo],
  );

  function selectOrder(value: string) {
    setOrderNo(value);
    const selected = data?.refundable_orders?.find((item) => item.order_no === value);
    if (selected) {
      setAmount(String(selected.refundable_amount_toman));
      setDestination(selected.payment_method === "wallet" ? "wallet" : "gateway");
    }
  }

  async function submit() {
    if (!selectedOrder || working) return;
    setError("");
    setNotice("");
    const amountToman = Math.round(Number(amount || 0));
    if (amountToman <= 0 || amountToman > selectedOrder.refundable_amount_toman) {
      setError("مبلغ درخواستی از مانده قابل بازپرداخت بیشتر است.");
      return;
    }
    if (reason.trim().length < 5) {
      setError("دلیل بازپرداخت را کامل تر بنویسید.");
      return;
    }

    setWorking(true);
    try {
      const response = await fetch("/api/finance/refunds", {
        method: "POST",
        cache: "no-store",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          order_no: orderNo,
          amount_toman: amountToman,
          destination,
          reason: reason.trim(),
        }),
      });
      const payload = await readJson<RefundResponse>(response);
      if (!response.ok || !payload?.success) {
        setError(payload?.message || "درخواست بازپرداخت ثبت نشد.");
        return;
      }
      setNotice(payload.message || "درخواست بازپرداخت ثبت شد.");
      setReason("");
      setOrderNo("");
      setAmount("");
      await load();
    } catch {
      setError("ارتباط با سرور هنگام ثبت درخواست قطع شد.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <Link href="/account/payments">← مرکز مالی</Link>
            <span>CHAKOD REFUNDS</span>
            <h1>بازپرداخت</h1>
            <p>برای سفارش پرداخت شده درخواست بازگشت وجه ثبت کنید. مبلغ نهایی هیچ وقت نمی تواند از مبلغ پرداخت شده بیشتر باشد.</p>
          </div>
          <Link className={styles.policy} href="/refund-policy">قوانین بازپرداخت</Link>
        </header>

        {error && <div className={styles.error}>{error}</div>}
        {notice && <div className={styles.notice}>{notice}</div>}

        {loading ? (
          <section className={styles.state}><span className={styles.loader}/><h2>در حال دریافت سفارش ها</h2></section>
        ) : (
          <>
            <section className={styles.requestGrid}>
              <div className={styles.formCard}>
                <span>درخواست جدید</span>
                <h2>انتخاب سفارش و مبلغ</h2>

                {(data?.refundable_orders?.length || 0) > 0 ? (
                  <>
                    <label>
                      سفارش
                      <select value={orderNo} onChange={(event) => selectOrder(event.target.value)}>
                        <option value="">انتخاب سفارش</option>
                        {data?.refundable_orders?.map((order) => (
                          <option key={order.order_no} value={order.order_no}>
                            {order.order_no} — {formatToman(order.refundable_amount_toman)} قابل بازگشت
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      مبلغ درخواستی (تومان)
                      <input type="number" min="1" max={selectedOrder?.refundable_amount_toman || undefined} value={amount} onChange={(event) => setAmount(event.target.value)} />
                    </label>

                    <label>
                      مقصد بازپرداخت
                      <select
                        value={destination}
                        onChange={(event) => setDestination(event.target.value as "wallet" | "gateway")}
                        disabled={selectedOrder?.payment_method === "wallet"}
                      >
                        <option value="gateway">روش پرداخت اصلی / درگاه</option>
                        <option value="wallet">کیف پول چاکود</option>
                      </select>
                    </label>

                    <label>
                      دلیل درخواست
                      <textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} placeholder="دلیل درخواست بازپرداخت را بنویسید..." />
                    </label>

                    <button type="button" disabled={working || !selectedOrder} onClick={() => void submit()}>
                      {working ? "در حال ثبت..." : "ثبت درخواست بازپرداخت"}
                    </button>
                  </>
                ) : (
                  <div className={styles.empty}>در حال حاضر سفارش دارای مانده قابل بازپرداخت وجود ندارد.</div>
                )}
              </div>

              <aside className={styles.summaryCard}>
                <span>سفارش انتخاب شده</span>
                <div><small>شماره سفارش</small><strong dir="ltr">{selectedOrder?.order_no || "—"}</strong></div>
                <div><small>خدمت</small><strong>{selectedOrder?.product_code || "—"}</strong></div>
                <div><small>مبلغ پرداخت شده</small><strong>{formatToman(selectedOrder?.paid_amount_toman || 0)}</strong></div>
                <div><small>مانده قابل بازپرداخت</small><strong>{formatToman(selectedOrder?.refundable_amount_toman || 0)}</strong></div>
                <div><small>روش پرداخت</small><strong>{selectedOrder?.payment_method === "wallet" ? "کیف پول" : "درگاه بانکی"}</strong></div>
              </aside>
            </section>

            <section className={styles.history}>
              <header><span>سوابق</span><h2>درخواست های بازپرداخت</h2></header>
              {(data?.refunds?.length || 0) > 0 ? (
                <div className={styles.historyList}>
                  {data?.refunds?.map((item) => (
                    <article key={item.id}>
                      <div>
                        <strong>{item.order_no}</strong>
                        <small>{item.reason}</small>
                        {item.admin_note && <small>یادداشت مدیر: {item.admin_note}</small>}
                      </div>
                      <div>
                        <b>{statusLabels[item.status] || item.status}</b>
                        <strong>{formatToman(item.amount_toman)}</strong>
                        <small>{item.destination === "wallet" ? "کیف پول" : "درگاه"}</small>
                      </div>
                    </article>
                  ))}
                </div>
              ) : <div className={styles.empty}>هنوز درخواست بازپرداختی ثبت نشده است.</div>}
            </section>
          </>
        )}
      </div>
      <MobileBottomNav />
    </main>
  );
}
