"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import styles from "./SupportCenterClient.module.css";

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
  created_at: string;
  replies?: Array<{
    id: number;
    author_type: string;
    body: string;
    created_at: string;
  }>;
};

type SupportResponse = {
  success?: boolean;
  message?: string;
  tickets?: Ticket[];
  ticket?: {
    ticket_no: string;
    status: string;
    tracking_url: string;
  };
};

const supportTopics = [
  { value: "account", title: "حساب و ورود", text: "ورود، نشست، تایید شماره و امنیت حساب", href: "/account/security", action: "امنیت حساب" },
  { value: "listing", title: "آگهی و تصاویر", text: "ثبت، ویرایش، تصاویر، رد یا وضعیت انتشار", href: "/account/listings", action: "آگهی های من" },
  { value: "payment", title: "پرداخت و فاکتور", text: "پرداخت ناموفق، کیف پول، فاکتور و بازپرداخت", href: "/account/payments", action: "مرکز مالی" },
  { value: "business", title: "نمایشگاه و کسب و کار", text: "پروفایل حرفه ای، تیم، نمایشگاه منتخب و اشتراک", href: "/account/business", action: "مرکز فرمان" },
  { value: "technical", title: "مشکل فنی سایت", text: "خطای صفحه، دکمه، بارگذاری یا عملکرد سایت", href: "#request", action: "ثبت مشکل فنی" },
  { value: "report", title: "گزارش و پیگیری", text: "موضوعی که از مسیرهای عادی حساب قابل حل نیست", href: "#request", action: "ثبت درخواست" },
];

const quickAnswers = [
  { question: "چرا آگهی من منتشر نشده است؟", answer: "از آگهی های من وارد مدیریت همان آگهی شوید. وضعیت بررسی، علت رد و عملیات بازفعال سازی از همان صفحه قابل پیگیری است." },
  { question: "پرداخت انجام شد اما خدمت فعال نیست؟", answer: "شماره سفارش و فاکتور را در مرکز مالی بررسی کنید. اگر وضعیت پرداخت تایید شده است ولی خدمت اعمال نشده، همان شماره سفارش را در تیکت وارد کنید." },
  { question: "چطور نمایشگاه وارد بخش نمایشگاه های منتخب می شود؟", answer: "از بخش تبلیغات کسب و کار، جایگاه نمایشگاه منتخب را رزرو کنید؛ بعد از پرداخت و تایید مدیر، نمایشگاه در بازه و استان انتخاب شده وارد ریل منتخب می شود." },
  { question: "برای بازپرداخت باید چه کار کنم؟", answer: "از حساب کاربری وارد بخش بازپرداخت شوید، سفارش پرداخت شده را انتخاب کنید و مبلغ و دلیل درخواست را ثبت کنید." },
];

const topicLabels: Record<string, string> = {
  account: "حساب و ورود",
  listing: "آگهی و تصاویر",
  payment: "پرداخت و فاکتور",
  business: "نمایشگاه و کسب و کار",
  technical: "مشکل فنی",
  report: "گزارش و پیگیری",
  other: "سایر",
};

const statusLabels: Record<string, string> = {
  open: "باز",
  in_progress: "در حال بررسی",
  waiting_user: "منتظر پاسخ شما",
  waiting_support: "منتظر پاسخ پشتیبانی",
  resolved: "حل شده",
  closed: "بسته شده",
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

function cleanPrefill(value: string | null, maxLength: number) {
  return String(value || "").trim().slice(0, maxLength);
}

export default function SupportCenterClient() {
  const searchParams = useSearchParams();
  const [topic, setTopic] = useState("other");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [orderNo, setOrderNo] = useState("");
  const [listingId, setListingId] = useState("");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");

  async function loadTickets() {
    const token = localStorage.getItem("chakod_session_token") || "";
    setLoggedIn(Boolean(token));
    if (!token) {
      setTickets([]);
      return;
    }

    try {
      const response = await fetch("/api/support/requests", {
        cache: "no-store",
        credentials: "include",
        headers: { Accept: "application/json", ...authHeaders() },
      });
      const payload = await readJson<SupportResponse>(response);
      if (response.ok && payload?.success) {
        setTickets(Array.isArray(payload.tickets) ? payload.tickets : []);
      }
    } catch {
      // فرم درخواست حتی در زمان خطای تاریخچه باید قابل استفاده بماند.
    }
  }

  useEffect(() => {
    void loadTickets();
  }, []);

  useEffect(() => {
    const requestedTopic = cleanPrefill(searchParams.get("topic"), 40);
    if (requestedTopic && Object.prototype.hasOwnProperty.call(topicLabels, requestedTopic)) {
      setTopic(requestedTopic);
    }

    const requestedSubject = cleanPrefill(searchParams.get("subject"), 180);
    const requestedMessage = cleanPrefill(searchParams.get("message"), 1000);
    const requestedOrder = cleanPrefill(searchParams.get("order_no"), 100);
    const requestedListing = cleanPrefill(searchParams.get("listing_id"), 24).replace(/\D/g, "");

    if (requestedSubject) setSubject(requestedSubject);
    if (requestedMessage) setMessage(requestedMessage);
    if (requestedOrder) setOrderNo(requestedOrder);
    if (requestedListing) setListingId(requestedListing);

    if (requestedTopic || requestedSubject || requestedOrder || requestedListing) {
      window.setTimeout(
        () => document.getElementById("request")?.scrollIntoView({ behavior: "smooth" }),
        50,
      );
    }
  }, [searchParams]);

  function chooseTopic(value: string) {
    setTopic(value);
    const item = supportTopics.find((entry) => entry.value === value);
    if (item && !subject) setSubject(item.title);
    window.setTimeout(() => document.getElementById("request")?.scrollIntoView({ behavior: "smooth" }), 20);
  }

  async function submit() {
    if (submitting) return;
    setError("");
    setNotice("");
    setTrackingUrl("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/support/requests", {
        method: "POST",
        cache: "no-store",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          topic,
          subject,
          message,
          full_name: fullName,
          mobile,
          email,
          order_no: orderNo,
          listing_id: listingId ? Number(listingId) : undefined,
        }),
      });
      const payload = await readJson<SupportResponse>(response);
      if (!response.ok || !payload?.success || !payload.ticket) {
        setError(payload?.message || "ثبت درخواست پشتیبانی انجام نشد.");
        return;
      }

      const url = payload.ticket.tracking_url;
      setNotice(`درخواست ثبت شد. شماره پیگیری: ${payload.ticket.ticket_no}`);
      setTrackingUrl(url);
      if (!loggedIn) {
        try {
          const stored = JSON.parse(localStorage.getItem("chakod_support_tracking") || "[]") as string[];
          localStorage.setItem("chakod_support_tracking", JSON.stringify(Array.from(new Set([url, ...stored])).slice(0, 10)));
        } catch {
          localStorage.setItem("chakod_support_tracking", JSON.stringify([url]));
        }
      }
      setSubject("");
      setMessage("");
      setOrderNo("");
      setListingId("");
      await loadTickets();
    } catch {
      setError("ارتباط با سرویس پشتیبانی برقرار نشد.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <section className={styles.hero}>
          <span>CHAKOD SUPPORT</span>
          <h1>مرکز پشتیبانی چاکود</h1>
          <p>اول مسیر مرتبط را بررسی کنید؛ اگر موضوع حل نشد، تیکت واقعی با شماره پیگیری ثبت کنید و پاسخ پشتیبانی را از همین سایت ادامه دهید.</p>
          <div className={styles.heroActions}>
            <a href="#request">ثبت درخواست پشتیبانی</a>
            {loggedIn && <a href="#my-tickets">تیکت های من</a>}
          </div>
        </section>

        <section className={styles.topicGrid}>
          {supportTopics.map((item) => (
            <article key={item.value}>
              <span>◈</span>
              <h2>{item.title}</h2>
              <p>{item.text}</p>
              <div className={styles.topicActions}>
                <Link href={item.href}>{item.action}</Link>
                <button type="button" onClick={() => chooseTopic(item.value)}>تیکت این موضوع</button>
              </div>
            </article>
          ))}
        </section>

        <section className={styles.requestSection} id="request">
          <header>
            <span>درخواست جدید</span>
            <h2>ثبت تیکت پشتیبانی</h2>
            <p>{loggedIn ? "تیکت به حساب فعلی شما متصل می شود." : "برای مشکل ورود هم می توانید بدون ورود تیکت بسازید؛ لینک امن پیگیری را نگه دارید."}</p>
          </header>

          {error && <div className={styles.error}>{error}</div>}
          {notice && (
            <div className={styles.notice}>
              <span>{notice}</span>
              {trackingUrl && <Link href={trackingUrl}>باز کردن تیکت</Link>}
            </div>
          )}

          <div className={styles.formGrid}>
            <label>
              موضوع
              <select value={topic} onChange={(event) => setTopic(event.target.value)}>
                {Object.entries(topicLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label>
              عنوان درخواست
              <input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={180} placeholder="مثلا پرداخت انجام شده ولی خدمت فعال نشده" />
            </label>
            <label className={styles.wide}>
              شرح کامل
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={3000} placeholder="مشکل، زمان وقوع و کاری که انجام داده اید را توضیح دهید..." />
            </label>

            {!loggedIn && (
              <>
                <label>نام و نام خانوادگی<input value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength={120} /></label>
                <label>موبایل<input inputMode="tel" value={mobile} onChange={(event) => setMobile(event.target.value)} maxLength={16} placeholder="09..." /></label>
                <label>ایمیل (اختیاری)<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={180} /></label>
              </>
            )}

            <label>
              شماره سفارش (اختیاری)
              <input dir="ltr" value={orderNo} onChange={(event) => setOrderNo(event.target.value)} maxLength={100} />
            </label>
            <label>
              شناسه آگهی (اختیاری)
              <input inputMode="numeric" value={listingId} onChange={(event) => setListingId(event.target.value.replace(/\D/g, ""))} />
            </label>
          </div>

          <button className={styles.submitButton} type="button" disabled={submitting} onClick={() => void submit()}>
            {submitting ? "در حال ثبت درخواست..." : "ثبت درخواست و دریافت شماره پیگیری"}
          </button>
        </section>

        {loggedIn && (
          <section className={styles.ticketSection} id="my-tickets">
            <header><span>حساب من</span><h2>تیکت های اخیر</h2></header>
            {tickets.length ? (
              <div className={styles.ticketList}>
                {tickets.map((ticket) => (
                  <Link href={`/support/tickets/${encodeURIComponent(ticket.ticket_no)}`} key={ticket.ticket_no}>
                    <div>
                      <span>{topicLabels[ticket.topic] || ticket.topic}</span>
                      <strong>{ticket.subject}</strong>
                      <small>{ticket.ticket_no} · {formatDate(ticket.created_at)}</small>
                    </div>
                    <div>
                      <b>{statusLabels[ticket.status] || ticket.status}</b>
                      <small>{new Intl.NumberFormat("fa-IR").format(ticket.replies?.length || 0)} پاسخ</small>
                    </div>
                  </Link>
                ))}
              </div>
            ) : <p className={styles.empty}>هنوز تیکتی در این حساب ثبت نشده است.</p>}
          </section>
        )}

        <section className={styles.faq}>
          <header><span>پاسخ های سریع</span><h2>موضوعات پرتکرار</h2></header>
          <div>
            {quickAnswers.map((item) => (
              <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
