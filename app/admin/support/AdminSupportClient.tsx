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
  full_name?: string;
  mobile?: string;
  email?: string;
  is_guest?: boolean;
  topic: string;
  subject: string;
  message: string;
  order_no?: string;
  listing_id?: number | null;
  status: string;
  priority: string;
  admin_note?: string;
  last_reply_at?: string | null;
  closed_at?: string | null;
  created_at: string;
  updated_at: string;
  replies?: Reply[];
};

type SupportResponse = {
  success?: boolean;
  message?: string;
  tickets?: Ticket[];
};

const statusLabels: Record<string, string> = {
  open: "باز",
  in_progress: "در حال بررسی",
  waiting_user: "منتظر کاربر",
  waiting_support: "منتظر پشتیبانی",
  resolved: "حل شده",
  closed: "بسته شده",
};

const priorityLabels: Record<string, string> = {
  low: "کم",
  normal: "عادی",
  high: "زیاد",
  urgent: "فوری",
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

export default function AdminSupportClient() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState("active");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [statusDrafts, setStatusDrafts] = useState<Record<string, string>>({});
  const [priorityDrafts, setPriorityDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [workingTicket, setWorkingTicket] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/support/requests", {
        cache: "no-store",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const payload = await readJson<SupportResponse>(response);
      if (response.status === 401 || response.status === 403) {
        window.location.assign("/admin/login?returnTo=/admin/support");
        return;
      }
      if (!response.ok || !payload?.success) {
        setError(payload?.message || "تیکت های پشتیبانی دریافت نشدند.");
        return;
      }

      const rows = Array.isArray(payload.tickets) ? payload.tickets : [];
      setTickets(rows);
      setNoteDrafts(Object.fromEntries(rows.map((item) => [item.ticket_no, item.admin_note || ""])));
      setStatusDrafts(Object.fromEntries(rows.map((item) => [item.ticket_no, item.status])));
      setPriorityDrafts(Object.fromEntries(rows.map((item) => [item.ticket_no, item.priority])));
    } catch {
      setError("ارتباط با پنل پشتیبانی برقرار نشد.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesStatus = filter === "all"
        ? true
        : filter === "active"
          ? !["closed", "resolved"].includes(ticket.status)
          : ticket.status === filter;
      const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;
      return matchesStatus && matchesPriority;
    });
  }, [tickets, filter, priorityFilter]);

  const openCount = tickets.filter((item) => !["closed", "resolved"].includes(item.status)).length;
  const waitingSupport = tickets.filter((item) => item.status === "waiting_support" || item.status === "open").length;
  const urgentCount = tickets.filter((item) => item.priority === "urgent" && !["closed", "resolved"].includes(item.status)).length;

  async function mutate(ticket: Ticket, action: "reply" | "update" | "close" | "reopen") {
    if (workingTicket) return;
    const body = replyDrafts[ticket.ticket_no] || "";
    if (action === "reply" && body.trim().length < 2) {
      setError("متن پاسخ را وارد کنید.");
      return;
    }
    if (action === "close" && !window.confirm("این تیکت بسته شود؟")) return;

    setWorkingTicket(ticket.ticket_no);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/support/requests", {
        method: "POST",
        cache: "no-store",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          ticket_no: ticket.ticket_no,
          action,
          body: action === "reply" ? body.trim() : undefined,
          status: action === "update" ? statusDrafts[ticket.ticket_no] : undefined,
          priority: action === "update" ? priorityDrafts[ticket.ticket_no] : undefined,
          admin_note: noteDrafts[ticket.ticket_no] || "",
        }),
      });
      const payload = await readJson<SupportResponse>(response);
      if (!response.ok || !payload?.success) {
        setError(payload?.message || "عملیات تیکت انجام نشد.");
        return;
      }
      setNotice(payload.message || "تیکت به روز شد.");
      if (action === "reply") {
        setReplyDrafts((current) => ({ ...current, [ticket.ticket_no]: "" }));
      }
      await load();
    } catch {
      setError("ارتباط با سرور هنگام مدیریت تیکت قطع شد.");
    } finally {
      setWorkingTicket("");
    }
  }

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <Link href="/admin">← مدیریت</Link>
            <span>CHAKOD SUPPORT ADMIN</span>
            <h1>مدیریت پشتیبانی</h1>
            <p>تیکت های کاربران و مهمان ها، سفارش یا آگهی مرتبط و کل گفت و گو را از این صفحه مدیریت کنید.</p>
          </div>
          <button type="button" onClick={() => void load()}>به روزرسانی</button>
        </header>

        <section className={styles.stats}>
          <article><span>تیکت باز</span><strong>{new Intl.NumberFormat("fa-IR").format(openCount)}</strong></article>
          <article><span>نیازمند پاسخ</span><strong>{new Intl.NumberFormat("fa-IR").format(waitingSupport)}</strong></article>
          <article><span>فوری</span><strong>{new Intl.NumberFormat("fa-IR").format(urgentCount)}</strong></article>
        </section>

        <section className={styles.filterBar}>
          <div>
            {[["active","فعال"],["all","همه"],["waiting_support","منتظر پشتیبانی"],["waiting_user","منتظر کاربر"],["resolved","حل شده"],["closed","بسته"]].map(([value,label]) => (
              <button key={value} className={filter === value ? styles.active : ""} onClick={() => setFilter(value)}>{label}</button>
            ))}
          </div>
          <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
            <option value="all">همه اولویت ها</option>
            {Object.entries(priorityLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </section>

        {error && <div className={styles.error}>{error}</div>}
        {notice && <div className={styles.notice}>{notice}</div>}

        {loading ? (
          <section className={styles.state}><span className={styles.loader}/><h2>در حال دریافت تیکت ها</h2></section>
        ) : visible.length ? (
          <section className={styles.list}>
            {visible.map((ticket) => {
              const conversation = [
                { id: "initial", author_type: "user", body: ticket.message, created_at: ticket.created_at },
                ...(ticket.replies || []),
              ];
              return (
                <article className={styles.card} key={ticket.ticket_no}>
                  <div className={styles.cardHead}>
                    <div>
                      <span>{topicLabels[ticket.topic] || ticket.topic}</span>
                      <h2>{ticket.subject}</h2>
                      <p><b dir="ltr">{ticket.ticket_no}</b> · {formatDate(ticket.created_at)}</p>
                    </div>
                    <div className={styles.statusBox}>
                      <b>{statusLabels[ticket.status] || ticket.status}</b>
                      <small>اولویت: {priorityLabels[ticket.priority] || ticket.priority}</small>
                    </div>
                  </div>

                  <div className={styles.meta}>
                    <div><small>کاربر</small><strong>{ticket.full_name || (ticket.is_guest ? "مهمان" : "کاربر حساب")}</strong></div>
                    <div><small>موبایل</small><strong dir="ltr">{ticket.mobile || "—"}</strong></div>
                    <div><small>ایمیل</small><strong dir="ltr">{ticket.email || "—"}</strong></div>
                    <div><small>سفارش / آگهی</small><strong>{ticket.order_no || (ticket.listing_id ? `#${ticket.listing_id}` : "—")}</strong></div>
                  </div>

                  <section className={styles.conversation}>
                    {conversation.map((item) => (
                      <div className={item.author_type === "admin" ? styles.adminMessage : styles.userMessage} key={item.id}>
                        <header><strong>{item.author_type === "admin" ? "پشتیبانی" : "کاربر"}</strong><small>{formatDate(item.created_at)}</small></header>
                        <p>{item.body}</p>
                      </div>
                    ))}
                  </section>

                  <div className={styles.controls}>
                    <label>وضعیت<select value={statusDrafts[ticket.ticket_no] || ticket.status} onChange={(event) => setStatusDrafts((current) => ({ ...current, [ticket.ticket_no]: event.target.value }))}>{Object.entries(statusLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                    <label>اولویت<select value={priorityDrafts[ticket.ticket_no] || ticket.priority} onChange={(event) => setPriorityDrafts((current) => ({ ...current, [ticket.ticket_no]: event.target.value }))}>{Object.entries(priorityLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                    <label className={styles.note}>یادداشت داخلی<textarea value={noteDrafts[ticket.ticket_no] || ""} onChange={(event) => setNoteDrafts((current) => ({ ...current, [ticket.ticket_no]: event.target.value }))} maxLength={1000} /></label>
                  </div>

                  {ticket.status !== "closed" && (
                    <div className={styles.replyBox}>
                      <textarea value={replyDrafts[ticket.ticket_no] || ""} onChange={(event) => setReplyDrafts((current) => ({ ...current, [ticket.ticket_no]: event.target.value }))} maxLength={3000} placeholder="پاسخ به کاربر..." />
                      <button className={styles.replyButton} disabled={workingTicket === ticket.ticket_no} onClick={() => void mutate(ticket, "reply")}>ارسال پاسخ</button>
                    </div>
                  )}

                  <div className={styles.actions}>
                    <button disabled={workingTicket === ticket.ticket_no} onClick={() => void mutate(ticket, "update")}>ذخیره وضعیت و اولویت</button>
                    {ticket.status === "closed" ? (
                      <button className={styles.reopen} disabled={workingTicket === ticket.ticket_no} onClick={() => void mutate(ticket, "reopen")}>باز کردن تیکت</button>
                    ) : (
                      <button className={styles.close} disabled={workingTicket === ticket.ticket_no} onClick={() => void mutate(ticket, "close")}>بستن تیکت</button>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        ) : <section className={styles.state}><span>⌁</span><h2>تیکتی در این فیلتر وجود ندارد</h2></section>}
      </div>
    </main>
  );
}
