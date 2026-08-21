import Link from "next/link";

export default function HomeHero() {
  return (
    <section className="chakodHomeHero" dir="rtl">
      <div className="chakodHomeHeroContent">
        <span className="chakodHomeHeroKicker">بازار هوشمند خودرو</span>
        <h1>خودروی خاص خود را در چاکود پیدا کنید</h1>
        <p>
          خرید، فروش و معرفی خودروهای لوکس، منطقه آزاد، نمایشگاهی و شخصی در یک
          تجربه حرفه‌ای.
        </p>

        <div className="chakodHomeHeroActions">
          <Link href="/ads">مشاهده خودروها</Link>
          <Link href="/submit">ثبت آگهی</Link>
        </div>
      </div>
    </section>
  );
}
