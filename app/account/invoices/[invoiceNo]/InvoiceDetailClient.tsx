"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import MobileBottomNav from "../../../components/MobileBottomNav";
import styles from "./page.module.css";

type InvoiceDetail = {
  invoice_no: string;
  invoice_status: string;
  issued_at: string;
  order_no: string;
  order_type: string;
  product_code: string;
  amount_toman: number;
  discount_toman: number;
  final_amount_toman: number;
  currency: string;
  order_status: string;
  service_title: string;
  dealer_name: string;
  province: string;
  listing_id: number | null;
  payment_method: "wallet" | "gateway";
  gateway: string;
  reference_id: string;
  paid_at: string;
};

type InvoiceResponse = {
  success?: boolean;
  message?: string;
  invoice?: InvoiceDetail;
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

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value.replace(" ", "T"));
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("fa-IR", { dateStyle: "long", timeStyle: "short" }).format(date);
}

export default function InvoiceDetailClient({ invoiceNo }: { invoiceNo: string }) {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    const token = localStorage.getItem("chakod_session_token") || "";
    if (!token) {
      window.location.assign(`/login?returnTo=${encodeURIComponent(`/account/invoices/${invoiceNo}`)}`);
      return;
    }

    try {
      const response = await fetch(`/api/finance/invoices/${encodeURIComponent(invoiceNo)}`, {
        cache: "no-store",
        credentials: "include",
        headers: { Accept: "application/json", ...authHeaders() },
      });
      const payload = await readJson<InvoiceResponse>(response);
      if (response.status === 401) {
        window.location.assign(`/login?returnTo=${encodeURIComponent(`/account/invoices/${invoiceNo}`)}`);
        return;
      }
      if (!response.ok || !payload?.success || !payload.invoice) {
        setError(payload?.message || "فاکتور دریافت نشد.");
        return;
      }
      setInvoice(payload.invoice);
    } catch {
      setError("ارتباط با سرویس فاکتور برقرار نشد.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [invoiceNo]);

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.pageHeader}>
          <Link href="/account/invoices">← فاکتورهای من</Link>
          <div className={styles.headerActions}>
            <Link href="/account/refunds">درخواست بازپرداخت</Link>
            <button type="button" onClick={() => window.print()} disabled={!invoice}>چاپ / ذخیره PDF</button>
          </div>
        </header>

        {loading && (
          <section className={styles.state}><span className={styles.loader}/><h1>در حال دریافت فاکتور</h1></section>
        )}

        {!loading && error && (
          <section className={styles.state}><span>!</span><h1>فاکتور در دسترس نیست</h1><p>{error}</p><button onClick={() => void load()}>تلاش دوباره</button></section>
        )}

        {!loading && invoice && (
          <article className={styles.invoice}>
            <header className={styles.invoiceHead}>
              <div>
                <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
                <span>پلتفرم رشد کسب و کار</span>
              </div>
              <div>
                <small>شماره فاکتور</small>
                <strong dir="ltr">{invoice.invoice_no}</strong>
                <small>صادر شده: {formatDate(invoice.issued_at)}</small>
              </div>
            </header>

            <section className={styles.orderMeta}>
              <div><small>شماره سفارش</small><strong dir="ltr">{invoice.order_no}</strong></div>
              <div><small>وضعیت</small><strong>{invoice.invoice_status === "paid" ? "پرداخت شده" : invoice.invoice_status}</strong></div>
              <div><small>روش پرداخت</small><strong>{invoice.payment_method === "wallet" ? "کیف پول چاکود" : "درگاه بانکی"}</strong></div>
              <div><small>زمان پرداخت</small><strong>{formatDate(invoice.paid_at)}</strong></div>
            </section>

            <section className={styles.items}>
              <div className={styles.itemHead}><span>شرح خدمت</span><span>مبلغ</span></div>
              <div className={styles.itemRow}>
                <div>
                  <strong>{invoice.service_title || invoice.product_code}</strong>
                  <small dir="ltr">{invoice.product_code}</small>
                  {invoice.dealer_name && <small>مجموعه: {invoice.dealer_name}</small>}
                  {invoice.province && <small>محدوده: {invoice.province}</small>}
                  {invoice.listing_id && <small>آگهی هدف: #{new Intl.NumberFormat("fa-IR").format(invoice.listing_id)}</small>}
                </div>
                <strong>{formatToman(invoice.amount_toman)}</strong>
              </div>
            </section>

            <section className={styles.totals}>
              <div><span>مبلغ اولیه</span><strong>{formatToman(invoice.amount_toman)}</strong></div>
              <div><span>تخفیف</span><strong>{invoice.discount_toman ? `− ${formatToman(invoice.discount_toman)}` : formatToman(0)}</strong></div>
              <div className={styles.final}><span>مبلغ پرداخت شده</span><strong>{formatToman(invoice.final_amount_toman)}</strong></div>
            </section>

            {invoice.reference_id && (
              <section className={styles.reference}>
                <small>شناسه مرجع پرداخت</small>
                <strong dir="ltr">{invoice.reference_id}</strong>
              </section>
            )}

            <footer className={styles.invoiceFooter}>
              <p>این سند براساس سفارش و تراکنش ثبت شده در حساب چاکود تولید شده است.</p>
              <Link href="/support#request">مشکل در این پرداخت؟ ثبت تیکت پشتیبانی</Link>
            </footer>
          </article>
        )}
      </div>
      <MobileBottomNav />
    </main>
  );
}
