import Link from "next/link";

import Footer from "../components/layout/Footer";
import Header from "../components/layout/Header";
import styles from "./page.module.css";

const pillars = [
  {
    title: "بازار ساختاریافته خودرو",
    text: "آگهی های خودرو، نمایشگاه ها و خدمات مرتبط در مسیرهای مشخص و قابل جست وجو کنار هم قرار می گیرند.",
  },
  {
    title: "رشد کسب و کارهای خودرویی",
    text: "نمایشگاه، تعمیرگاه، مرکز خدمات و فروشگاه قطعات می توانند صفحه حرفه ای، تیم، آمار و محصولات دیده شدن خود را از یک حساب مدیریت کنند.",
  },
  {
    title: "تجربه مبتنی بر موقعیت",
    text: "صفحه اصلی و دایرکتوری ها با انتخاب استان، شهر و محدوده کاربر هماهنگ می شوند تا محتوای مرتبط تر نمایش داده شود.",
  },
];

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className={styles.page} dir="rtl">
        <div className={styles.shell}>
          <section className={styles.hero}>
            <span>ABOUT CHAKOD</span>
            <h1>چاکود؛ پلتفرم رشد کسب و کار</h1>
            <p>چاکود با بازار خودرو شروع شده و هدف محصول این است که خرید و فروش خودرو، معرفی نمایشگاه ها و دسترسی به کسب و کارهای خودرویی را در یک تجربه منسجم کنار هم قرار دهد.</p>
            <div className={styles.heroActions}>
              <Link href="/cars">ورود به بازار خودرو</Link>
              <Link href="/businesses">کسب و کارهای خودرویی</Link>
            </div>
          </section>

          <section className={styles.pillars}>
            {pillars.map((item, index) => (
              <article key={item.title}>
                <span>{new Intl.NumberFormat("fa-IR").format(index + 1)}</span>
                <h2>{item.title}</h2>
                <p>{item.text}</p>
              </article>
            ))}
          </section>

          <section className={styles.story}>
            <div>
              <span>محصول در عمل</span>
              <h2>یک حساب، چند مسیر واقعی</h2>
              <p>کاربر شخصی می تواند آگهی ثبت و مدیریت کند، نمایشگاه می تواند موجودی خودرو و تیم خود را مدیریت کند و کسب و کارهای خودرویی می توانند صفحه حرفه ای و خدمات خود را معرفی کنند. کیف پول، پرداخت، فاکتور، بازپرداخت و پشتیبانی نیز از همان حساب در دسترس هستند.</p>
            </div>
            <div className={styles.pathGrid}>
              <Link href="/account/listings/new"><strong>ثبت آگهی</strong><small>شروع فروش خودرو</small></Link>
              <Link href="/dealerships"><strong>نمایشگاه ها</strong><small>مشاهده ویترین ها و موجودی</small></Link>
              <Link href="/businesses"><strong>خدمات خودرو</strong><small>پیدا کردن کسب و کار مرتبط</small></Link>
              <Link href="/support"><strong>پشتیبانی</strong><small>ثبت و پیگیری تیکت</small></Link>
            </div>
          </section>

          <section className={styles.transparency}>
            <span>شفافیت محصول</span>
            <h2>جایگاه های پولی از محتوای عادی جدا مدیریت می شوند</h2>
            <p>محصولاتی مثل ارتقای آگهی یا جایگاه نمایشگاه منتخب از مسیر سفارش و پرداخت مشخص عبور می کنند. نمایشگاه منتخب بعد از رزرو محدوده و زمان، پرداخت و تایید مدیر وارد Rail مربوط در صفحه اصلی می شود.</p>
            <div>
              <Link href="/terms">شرایط استفاده</Link>
              <Link href="/privacy">حریم خصوصی</Link>
              <Link href="/refund-policy">بازپرداخت</Link>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
