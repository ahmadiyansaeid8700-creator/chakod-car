import Link from "next/link";

import Footer from "../layout/Footer";
import Header from "../layout/Header";
import styles from "./AdvertisingProductPage.module.css";

type Step = {
  title: string;
  text: string;
};

type Props = {
  eyebrow: string;
  title: string;
  intro: string;
  ctaLabel: string;
  ctaHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  steps: Step[];
  notes?: string[];
};

export default function AdvertisingProductPage({
  eyebrow,
  title,
  intro,
  ctaLabel,
  ctaHref,
  secondaryLabel = "همه محصولات تبلیغاتی",
  secondaryHref = "/advertising",
  steps,
  notes = [],
}: Props) {
  return (
    <>
      <Header />
      <main className={styles.page} dir="rtl">
        <div className={styles.shell}>
          <section className={styles.hero}>
            <span>{eyebrow}</span>
            <h1>{title}</h1>
            <p>{intro}</p>
            <div className={styles.actions}>
              <Link href={ctaHref}>{ctaLabel}</Link>
              <Link href={secondaryHref}>{secondaryLabel}</Link>
            </div>
          </section>

          <section className={styles.steps}>
            <header>
              <span>فرایند سفارش</span>
              <h2>از انتخاب تا فعال سازی</h2>
            </header>
            <div>
              {steps.map((step, index) => (
                <article key={step.title}>
                  <b>{new Intl.NumberFormat("fa-IR").format(index + 1)}</b>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              ))}
            </div>
          </section>

          {notes.length > 0 && (
            <section className={styles.notes}>
              <strong>نکات مهم</strong>
              <ul>
                {notes.map((note) => <li key={note}>{note}</li>)}
              </ul>
            </section>
          )}

          <section className={styles.finalCta}>
            <div>
              <span>آماده سفارش</span>
              <h2>{title}</h2>
              <p>تعرفه نهایی و وضعیت قابل سفارش بودن از تنظیمات فعال چاکود و Commerce خوانده می شود.</p>
            </div>
            <Link href={ctaHref}>{ctaLabel}</Link>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
