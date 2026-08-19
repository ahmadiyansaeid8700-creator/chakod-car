"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./page.module.css";

type Payload = {
  success: boolean;
  settings?: {
    public_title: string;
    public_description: string;
    registrations_open: boolean;
    customer_discount_percent: number;
    bonus_commission_percent: number;
    regular_commission_percent: number;
    bonus_qualified_sales_count: number;
    attribution_days: number;
    period_close_day: number;
    payout_day: number;
    minimum_payout_toman: number;
  };
  readiness?: { ready: boolean; open: boolean; missing: string[] };
};

function fa(value: number) {
  return Number(value || 0).toLocaleString("fa-IR");
}

export default function AffiliateLandingClient() {
  const router = useRouter();
  const [data, setData] = useState<Payload | null>(null);

  useEffect(() => {
    fetch("/api/public/affiliate", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: Payload) => setData(payload))
      .catch(() => setData({ success: false }));
  }, []);

  const settings = data?.settings;
  return (
    <main className={styles.page}>
      <nav className={styles.topNav}>
        <button type="button" onClick={() => window.history.length > 1 ? router.back() : router.push("/")}>بازگشت</button>
        <Link href="/">صفحه اصلی</Link>
        <Link href="/account/affiliate">پنل همکاری در فروش</Link>
        <Link href="/account">حساب کاربری</Link>
      </nav>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <span className={styles.eyebrow}>همکاری در فروش چاکود</span>
          <h1>{settings?.public_title || "از معرفی چاکود درآمد بگیرید"}</h1>
          <p>{settings?.public_description || "لینک اختصاصی خود را منتشر کنید و از خرید واقعی کاربران معرفی‌شده پورسانت بگیرید."}</p>
          <div className={styles.actions}>
            <Link className={styles.primary} href="/account/affiliate">شروع همکاری در فروش</Link>
            <Link className={styles.secondary} href="/account/services">مشاهده خدمات چاکود</Link>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <div><span>پورسانت شروع</span><strong>تا {fa(settings?.bonus_commission_percent || 40)}٪</strong></div>
          <div><span>تخفیف مشتری معرفی‌شده</span><strong>{fa(settings?.customer_discount_percent || 10)}٪</strong></div>
          <div><span>اعتبار انتساب لینک</span><strong>{fa(settings?.attribution_days || 30)} روز</strong></div>
          <div><span>تسویه</span><strong>بستن روز {fa(settings?.period_close_day || 30)}، پرداخت روز {fa(settings?.payout_day || 5)}</strong></div>
        </div>
      </section>

      <section className={styles.grid}>
        <article><b>۱</b><h2>عضو شوید</h2><p>قوانین همکاری را بپذیرید و لینک اختصاصی خود را دریافت کنید.</p></article>
        <article><b>۲</b><h2>لینک را معرفی کنید</h2><p>لینک را در اینستاگرام، تلگرام، واتساپ، وب‌سایت یا ارتباطات شخصی منتشر کنید.</p></article>
        <article><b>۳</b><h2>مشتری خرید می‌کند</h2><p>کاربر خودش وارد چاکود می‌شود، آگهی را ثبت می‌کند و مستقیم به چاکود پرداخت می‌کند.</p></article>
        <article><b>۴</b><h2>پورسانت ثبت می‌شود</h2><p>بعد از پرداخت موفق، تأیید خدمت و پایان دوره بررسی، پورسانت قابل تسویه می‌شود.</p></article>
      </section>

      <section className={styles.rules}>
        <div><h2>مدل شفاف و یک‌سطحی</h2><p>پورسانت فقط از خرید مستقیم کاربران معرفی‌شده پرداخت می‌شود. زیرمجموعه‌گیری و درآمد زنجیره‌ای وجود ندارد.</p></div>
        <ul>
          <li>ثبت‌نام یا کلیک به‌تنهایی پورسانت ندارد.</li>
          <li>خرید با لینک شخصی، حساب ساختگی و ترافیک غیرواقعی ممنوع است.</li>
          <li>همکار فروش نماینده، کارمند یا شعبه چاکود نیست.</li>
          <li>تسویه فقط پس از احراز هویت و تأیید شماره شبا انجام می‌شود.</li>
        </ul>
      </section>

      {data?.readiness && !data.readiness.open ? (
        <section className={styles.notice}>ثبت‌نام عمومی هنوز باز نشده است. زیرساخت نصب شده و پس از انتشار قوانین و تکمیل مشخصات قانونی فعال می‌شود.</section>
      ) : null}
    </main>
  );
}
