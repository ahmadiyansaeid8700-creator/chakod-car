import type { Metadata } from "next";
import Link from "next/link";
import styles from "./not-found.module.css";

export const metadata: Metadata = {
  title: "صفحه پیدا نشد | چاکود",
  description: "صفحه‌ای که به دنبال آن هستید در چاکود پیدا نشد.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFoundPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="not-found-title">
        <Link className={styles.brand} href="/" aria-label="بازگشت به چاکود">
          <span className={styles.brandMark} aria-hidden="true">
            چ
          </span>
          <span>چاکود</span>
        </Link>

        <p className={styles.code} aria-hidden="true">
          ۴۰۴
        </p>

        <h1 className={styles.title} id="not-found-title">
          این مسیر به جایی نمی‌رسد
        </h1>

        <p className={styles.description}>
          ممکن است آدرس اشتباه وارد شده باشد، صفحه جابه‌جا شده باشد یا دیگر در
          دسترس نباشد. از مسیرهای اصلی چاکود ادامه بدهید.
        </p>

        <div className={styles.actions}>
          <Link className={styles.primary} href="/">
            بازگشت به صفحه اصلی
          </Link>
          <Link className={styles.secondary} href="/cars">
            مشاهده بازار خودرو
          </Link>
        </div>
      </section>
    </main>
  );
}
