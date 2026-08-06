import Link from "next/link";
import styles from "./HomeFeaturedShowrooms.module.css";

type Props = {
  location: string;
  query: string;
};

export default function HomeFeaturedShowrooms(_props: Props) {
  return (
    <section className={styles.dealerSection} id="showrooms">
      <div className={styles.sectionIntro}>
        <div>
          <span className={styles.eyebrow}>نمایشگاه‌های چاکود</span>
          <h2>نمایشگاه‌های منتخب</h2>
        </div>

        <div className={styles.sectionActions}>
          <Link href="/showrooms">
            مشاهده نمایشگاه‌ها
            <span aria-hidden="true">←</span>
          </Link>
        </div>
      </div>

      <div className={styles.compactEmpty}>
        <strong>خودروها را از فروشندگان حرفه‌ای بررسی کن</strong>
        <span>
          فهرست نمایشگاه‌ها، خودروهای فعال و اطلاعات هر مجموعه در صفحه اختصاصی
          نمایشگاه‌ها در دسترس است.
        </span>
      </div>
    </section>
  );
}
