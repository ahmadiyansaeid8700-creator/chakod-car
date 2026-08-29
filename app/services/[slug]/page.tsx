import { redirect } from "next/navigation";

import { PRELAUNCH_BUSINESSES } from "../../../lib/prelaunch-fixtures";
import { prelaunchServerFixturesEnabled } from "../../../lib/prelaunch-server-fixtures";
import styles from "../../businesses/[slug]/page.module.css";

export default async function StagingServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!prelaunchServerFixturesEnabled()) {
    redirect(`/businesses/${encodeURIComponent(slug)}`);
  }

  const business = PRELAUNCH_BUSINESSES.find((item) => item.slug === slug);
  if (!business) {
    redirect(`/businesses/${encodeURIComponent(slug)}`);
  }

  const location = [business.neighborhood, business.city, business.province]
    .filter(Boolean)
    .join("، ");
  const tags = Array.from(new Set([...business.category_labels, ...business.services]));

  return (
    <main className={styles.page} dir="rtl">
      <header className={styles.header}>
        <a href="/">
          <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
        </a>
        <nav>
          <a href="/services">بازار خدمات</a>
          <a href="/car-services">خدمات خودرو</a>
          <a href="/parts-stores">لوازم یدکی</a>
          <a href="/workshops">تعمیرکاران</a>
        </nav>
      </header>

      <section className={styles.hero}>
        <div className={styles.cover}>
          {business.cover_url ? <img src={business.cover_url} alt="" /> : <span />}
        </div>
        <div className={styles.identity}>
          {business.logo_url ? (
            <img src={business.logo_url} alt={business.name} />
          ) : (
            <b>{business.name.slice(0, 1)}</b>
          )}
          <div>
            <span>{business.business_type_title}</span>
            <h1>{business.name}</h1>
            <p>{location}</p>
          </div>
          {business.is_verified ? <em>نمونه تأییدشده دمو چاکود</em> : null}
        </div>
      </section>

      <div className={styles.layout}>
        <article className={styles.content}>
          <section>
            <h2>درباره مجموعه</h2>
            <p>{business.description}</p>
          </section>

          <section>
            <h2>زمینه فعالیت و خدمات</h2>
            <div className={styles.tags}>
              {tags.map((item) => <span key={item}>{item}</span>)}
            </div>
            {business.mobile_service ? (
              <div className={styles.mobileBadge}>این مجموعه در دموی چاکود خدمات در محل ارائه می‌دهد.</div>
            ) : null}
          </section>

          <section>
            <h2>اطلاعات دمو</h2>
            <p>
              این پروفایل با پیشوند TEST_ فقط برای معرفی تجربه بازار خدمات در staging ساخته شده و اطلاعات تماس واقعی ندارد.
            </p>
          </section>
        </article>

        <aside className={styles.sidebar}>
          <div>
            <span>نشانی</span>
            <strong>{business.address || location}</strong>
          </div>
          <div>
            <span>محدوده قیمت</span>
            <strong>{business.price_range_text}</strong>
          </div>
          <div>
            <span>وضعیت</span>
            <strong>TEST_ پروفایل نمایشی</strong>
          </div>
          <a className={styles.primary} href="/services">بازگشت به بازار خدمات</a>
        </aside>
      </div>
    </main>
  );
}
