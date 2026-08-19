import Link from "next/link";

import Footer from "../layout/Footer";
import Header from "../layout/Header";
import styles from "./PolicyPage.module.css";

type PolicySection = {
  title: string;
  paragraphs: string[];
  items?: string[];
};

type PolicyPageProps = {
  eyebrow: string;
  title: string;
  intro: string;
  updatedAt: string;
  sections: PolicySection[];
};

const policyLinks = [
  { href: "/rules", label: "قوانین استفاده" },
  { href: "/privacy", label: "حریم خصوصی" },
  { href: "/terms", label: "شرایط استفاده" },
  { href: "/refund-policy", label: "بازپرداخت" },
  { href: "/legal", label: "اطلاعات حقوقی" },
  { href: "/support", label: "پشتیبانی" },
];

export default function PolicyPage({
  eyebrow,
  title,
  intro,
  updatedAt,
  sections,
}: PolicyPageProps) {
  return (
    <>
      <Header />
      <main className={styles.page} dir="rtl">
        <div className={styles.shell}>
          <section className={styles.hero}>
            <span>{eyebrow}</span>
            <h1>{title}</h1>
            <p>{intro}</p>
            <small>آخرین بازبینی: {updatedAt}</small>
          </section>

          <nav className={styles.navigation} aria-label="صفحات قانونی چاکود">
            {policyLinks.map((item) => (
              <Link key={item.href} href={item.href}>{item.label}</Link>
            ))}
          </nav>

          <section className={styles.content}>
            {sections.map((section, index) => (
              <article key={section.title} id={`section-${index + 1}`}>
                <span>{new Intl.NumberFormat("fa-IR").format(index + 1)}</span>
                <div>
                  <h2>{section.title}</h2>
                  {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  {section.items?.length ? (
                    <ul>
                      {section.items.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  ) : null}
                </div>
              </article>
            ))}
          </section>

          <section className={styles.helpCard}>
            <div>
              <span>سؤال یا ابهام</span>
              <h2>برای بررسی موضوع با پشتیبانی چاکود در ارتباط باشید</h2>
              <p>درخواست‌های مرتبط با حساب، آگهی، پرداخت و حقوق کاربران از مسیر پشتیبانی پیگیری می‌شوند.</p>
            </div>
            <Link href="/support">رفتن به پشتیبانی</Link>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
