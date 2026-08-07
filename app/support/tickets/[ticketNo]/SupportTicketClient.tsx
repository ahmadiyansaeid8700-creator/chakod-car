"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import styles from "./page.module.css";

type Reply = {
  id: number;
  author_type: string;
  body: string;
  created_at: string;
};

type Ticket = {
  ticket_no: string;
  topic: string;
  subject: string;
  message: string;
  order_no?: string;
  listing_id?: number | null;
  status: string;
  priority: string;
  last_reply_at?: string | null;
  closed_at?: string | null;
  created_at: string;
  updated_at: string;
  replies?: Reply[];
};

type TicketResponse = {
  success?: boolean;
  message?: string;
  ticket?: Ticket;
};

const statusLabels: Record<string, string> = {
  open: "باز",
  in_progress: "در حال بررسی",
  waiting_user: "منتظر پاسخ شما",
  waiting_support: "منتظر پاسخ پشتیبانی",
  resolved: "حل شده",
  closed: "بسته شده",
};

const topicLabels: Record<string, string> = {
  account: "حساب و ورود",
  listing: "آگهی و تصاویر",
  payment: "پرداخت و فاکتور",
  business: "نمایشگاه و کسب و کار",
  technical: "مشکل فنی",
  report: "گزارش و پیگیری",
  other: "سایر",
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

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value.replace(" ", "T"));
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function SupportTicketClient({ ticketNo }: { ticketNo: string }) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [guestAccess, setGuestAccess] = useState("");

  useEffect(() => {
    const access = new URLSearchParams(window.location.search).get("access") || "";
    setGuestAccess(access);
  }, []);

  async function load(accessOverride?: string) {
    setLoading(true);
    setError("");
    const access = accessOverride ?? guestAccess;
    const query = access ? `?access=${encodeURIComponent(access)}` : "";

    try {
      const response = await fetch(`/api/support/requests/${encodeURIComponent(ticketNo)}${query}`, {
        cache: "no-store",
        credentials: "include",
        headers: { Accept: "application/json", ...authHeaders() },
      });
      const payload = await readJson<TicketResponse>(response);
      if (!response.ok || !payload?.success || !payload.ticket) {
        setTicket(null);
        setError(payload?.message || "تیکت در دسترس نیست.");
        return;
      }
      setTicket(payload.ticket);
    } catch {
      setTicket(null);
      setError("ارتباط با سرویس پشتیبانی برقرار نشد.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const access = new URLSearchParams(window.location.search).get("access") || "";
    void load(access);
  }, [ticketNo]);

  const conversation = useMemo(() => {
    if (!ticket) return [] as Array<{ key: string; author: string; body: string; createdAt: string }>;
    return [
      { key: "initial", author: "user", body: ticket.message, createdAt: ticket.created_at },
      ...(ticket.replies || []).map((item) => ({
        key: String(item.id),
        author: item.author_type,
        body: item.body,
        createdAt: item.created_at,
      })),
    ];
  }, [ticket]);

  async function sendReply() {
    if (!ticket || working || reply.trim().length < 2) return;
    setWorking(true);
    setError("");
    setNotice("");

    try {
      const query = guestAccess ? `?access=${encodeURIComponent(guestAccess)}` : "";
      const response = await fetch(`/api/support/requests/${encodeURIComponent(ticket.ticket_no)}${query}`, {
        method: "POST",
        cache: "no-store",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(guestAccess ? { "X-Support-Access": guestAccess } : {}),
          ...authHeaders(),
        },
        body: JSON.stringify({ body: reply.trim() }),
      });
      const payload = await readJson<TicketResponse>(response);
      if (!response.ok || !payload?.success) {
        setError(payload?.message || "پاسخ ثبت نشد.");
        return;
      }
      setReply("");
      setNotice(payload.message || "پاسخ ثبت شد.");
      await load();
    } catch {
      setError("ارتباط با پشتیبانی هنگام ارسال پاسخ قطع شد.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/support">← مرکز پشتیبانی</Link>
          <div>
            <span>شماره پیگیری</span>
            <strong dir="ltr">{ticketNo}</strong>
          </div>
        </header>

        {loading && <section className={styles.state}><span className={styles.loader}/><h1>در حال دریافت تیکت</h1></section>}
        {!loading && error && !ticket && (
          <section className={styles.state}>
            <span>!</span><h1>تیکت در دسترس نیست</h1><p>{error}</p><button onClick={() => void load()}>تلاش دوباره</button>
          </section>
        )}

        {!loading && ticket && (
          <>
            <section className={styles.ticketHero}>
              <div>
                <span>{topicLabels[ticket.topic] || ticket.topic}</span>
                <h1>{ticket.subject}</h1>
                <p>ثبت شده در {formatDate(ticket.created_at)}</p>
              </div>
              <div className={styles.statusBox}>
                <small>وضعیت</small>
                <strong>{statusLabels[ticket.status] || ticket.status}</strong>
              </div>
            </section>

            {(ticket.order_no || ticket.listing_id) && (
              <section className={styles.references}>
                {ticket.order_no && <div><small>شماره سفارش</small><strong dir="ltr">{ticket.order_no}</strong></div>}
                {ticket.listing_id && <div><small>شناسه آگهی</small><strong>#{new Intl.NumberFormat("fa-IR").format(ticket.listing_id)}</strong></div>}
              </section>
            )}

            <section className={styles.conversation}>
              <header><span>گفت و گو</span><h2>پیام های تیکت</h2></header>
              <div className={styles.messages}>
                {conversation.map((item) => (
                  <article className={item.author === "admin" ? styles.adminMessage : styles.userMessage} key={item.key}>
                    <div><strong>{item.author === "admin" ? "پشتیبانی چاکود" : "شما"}</strong><small>{formatDate(item.createdAt)}</small></div>
                    <p>{item.body}</p>
                  </article>
                ))}
              </div>

              {error && <div className={styles.error}>{error}</div>}
              {notice && <div className={styles.notice}>{notice}</div>}

              {!["closed", "resolved"].includes(ticket.status) ? (
                <div className={styles.replyBox}>
                  <textarea value={reply} onChange={(event) => setReply(event.target.value)} maxLength={3000} placeholder="پاسخ یا توضیح تکمیلی را بنویسید..." />
                  <button disabled={working || reply.trim().length < 2} onClick={() => void sendReply()}>
                    {working ? "در حال ارسال..." : "ارسال پاسخ"}
                  </button>
                </div>
              ) : (
                <div className={styles.closed}>این تیکت {ticket.status === "resolved" ? "حل شده" : "بسته شده"} است.</div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
