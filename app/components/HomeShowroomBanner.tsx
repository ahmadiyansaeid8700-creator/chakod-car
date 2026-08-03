import styles from "./HomeShowroomBanner.module.css";

type HomeShowroomBannerProps = {
  location: string;
};

function ArrowIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 12H5m6-6-6 6 6 6" />
    </svg>
  );
}

export default function HomeShowroomBanner({
  location,
}: HomeShowroomBannerProps) {
  return (
    <a
      className={styles.banner}
      href="/account/ads"
      aria-label={`رزرو جایگاه تبلیغاتی نمایشگاه‌داران در ${location}`}
    >
      <span className={styles.media} aria-hidden="true">
        <img src="/banners/home-hero.png" alt="" />
      </span>

      <span className={styles.mobileCopy} aria-hidden="true">
        <small>ویترین ویژه نمایشگاه‌داران</small>
        <strong>خودروهای منتخب را نزدیک خودت ببین</strong>
        <i>
          رزرو جایگاه
          <ArrowIcon />
        </i>
      </span>
    </a>
  );
}
