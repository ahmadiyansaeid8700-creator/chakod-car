import Link from "next/link";

import Footer from "../components/layout/Footer";
import Header from "../components/layout/Header";
import styles from "./page.module.css";

const supportTopics = [
  {
    title: "حساب و ورود",
    text: "بررسی نشست، تأیید شماره موبایل، خروج و امنیت حساب",
    href: "/account/security",
    action: "امنیت حساب",
  },
  {
    title: "آگهی و تصاویر",
    text: "ثبت، ویرایش، مدیریت عکس، علت رد و وضعیت انتشار",
    href: "/account/listings",
    action: "آگهی‌های من",
  },
  {
    title: "پرداخت و فاکتور",
    text: "سفارش نیمه‌تمام، پرداخت ناموفق، فاکتور و بازپرداخت",
    href: "/account/payments",
    action: "مرکز مالی",
  },
  {
    title: "نمایشگاه و کسب‌وکار",
    text: "پروفایل حرفه‌ای، تیم، تبلیغات، اشتراک و گزارش عملکرد",
    href: "/account/business",
    action: "مرکز فرمان",
  },
  {
    title: "قوانین و حریم خصوصی",
    text: "شرایط استفاده، بازپرداخت، حقوق کاربران و حفاظت از داده",
    href: "/legal",
    action: "صفحات قانونی",
  },
  {
    title: "گزارش عمومی",
    text: "موضوعی که از مسیرهای حساب قابل حل نیست را از تماس با ما پیگیری کنید.",
    href: "/contact",
    action: "تماس با ما",
  },
];

const quickAnswers = [
  {
    question: "چرا آگهی من منتشر نشده است؟",
    answer: "وضعیت بررسی و علت رد در صفحه مدیریت همان آگهی نمایش داده می‌شود. پس از اصلاح، اطلاعات دوباره برای بررسی ارسال می‌شوند.",
  },
  {
    question: "پرداخت بانکی انجام شد اما خدمت فعال نیست؟",
    answer: "ابتدا صفحه پرداخت‌ها و فاکتورها را بررسی کنید. خدمت فقط بعد از Verify سمت سرور فعال می‌شود؛ در صورت نبود فاکتور، شماره سفارش را برای پشتیبانی نگه دارید.",
  },
  {
    question: "چطور تصویر اصلی خودرو را تغییر دهم؟",
    answer: "از آگهی‌های من وارد مدیریت آگهی شوید، بخش تصاویر را باز کنید و روی انتخاب به‌عنوان تصویر اصلی بزنید.",
  },
  {
    question: "اشتراک حرفه‌ای برای کدام مجموعه فعال می‌شود؟",
    answer: "هنگام خرید اشتراک، نمایشگاه یا کسب‌وکار هدف انتخاب می‌شود و شناسه همان مجموعه در سفارش Commerce ثبت خواهد شد.",
  },
];

export default function SupportPage() {
  return (
    <>
      <Header />
      <main className={styles.page} dir="rtl">
        <div className={styles.shell}>
          <section className={styles.hero}>
            <span>CHAKOD SUPPORT</span>
            <h1>مرکز پشتیبانی چاکود</h1>
            <p>مسیر مناسب را انتخاب کنید تا مستقیم به بخش مرتبط با حساب، آگهی، پرداخت یا کسب‌وکار برسید.</p>
            <div className={styles.heroActions}>
              <Link href="/account/notifications">موارد نیازمند توجه</Link>
              <Link href="/contact">تماس با ما</Link>
            </div>
          </section>

          <section className={styles.topicGrid}>
            {supportTopics.map((topic) => (
              <article key={topic.title}>
                <span>◈</span>
                <h2>{topic.title}</h2>
                <p>{topic.text}</p>
                <Link href={topic.href}>{topic.action}</Link>
              </article>
            ))}
          </section>

          <section className={styles.faq}>
            <header>
              <span>پاسخ‌های سریع</span>
              <h2>موضوعات پرتکرار</h2>
            </header>
            <div>
              {quickAnswers.map((item) => (
                <details key={item.question}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </section>

          <section className={styles.footerCard}>
            <div>
              <span>موضوع حل نشد؟</span>
              <h2>اطلاعات سفارش یا شناسه آگهی را آماده کنید</h2>
              <p>برای بررسی سریع‌تر، شماره سفارش، شناسه آگهی و شرح دقیق مشکل را همراه درخواست خود ارسال کنید.</p>
            </div>
            <Link href="/contact">ثبت درخواست تماس</Link>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
