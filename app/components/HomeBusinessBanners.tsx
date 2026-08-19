import Image from "next/image";
import Link from "next/link";
import styles from "./HomeBusinessBanners.module.css";

const banners = [
  {
    key: "repair",
    image: "/banners/chakod-repair-business.png",
    imageAlt: "تعمیرگاه مدرن خودرو",
    badge: "ویژه تعمیرکاران",
    title: "تعمیرگاهت را به مشتری‌های نزدیک معرفی کن",
    description:
      "خدمات، آدرس و راه‌های تماس تعمیرگاهت را حرفه‌ای نمایش بده.",
    href: "/account?join=repair",
    tone: "repair",
  },
  {
    key: "parts",
    image: "/banners/chakod-parts-business.png",
    imageAlt: "فروشگاه مدرن لوازم یدکی خودرو",
    badge: "ویژه فروشگاه‌ها",
    title: "فروشگاه لوازم یدکی را وارد بازار چاکود کن",
    description:
      "قطعات، برندها و اطلاعات تماس فروشگاهت را به مشتری‌ها نشان بده.",
    href: "/account?join=parts",
    tone: "parts",
  },
] as const;

export default function HomeBusinessBanners() {
  return (
    <section
      className={styles.section}
      dir="rtl"
      aria-label="عضویت کسب‌وکارها در چاکود"
    >
      <div className={styles.grid}>
        {banners.map((banner) => (
          <article
            className={`${styles.card} ${styles[banner.tone]}`}
            key={banner.key}
          >
            <Image
              className={styles.image}
              src={banner.image}
              alt={banner.imageAlt}
              fill
              sizes="(max-width: 940px) 100vw, 50vw"
              quality={90}
            />

            <div className={styles.shade} aria-hidden="true" />

            <div className={styles.content}>
              <span className={styles.badge}>{banner.badge}</span>

              <h2>{banner.title}</h2>

              <p>{banner.description}</p>

              <Link className={styles.button} href={banner.href}>
                ثبت درخواست عضویت
                <span aria-hidden="true">←</span>
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
