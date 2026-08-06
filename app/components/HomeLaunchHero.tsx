import Link from "next/link";

const HERO_FEATURES = [
  {
    title: "انتخاب سریع",
    description: "جست‌وجو بر اساس خودرو، شهر و نوع بازار",
  },
  {
    title: "ویترین حرفه‌ای",
    description: "خودروهای لوکس، منطقه آزاد و نمایشگاه‌های منتخب",
  },
  {
    title: "مسیر کامل خودرو",
    description: "از پیدا کردن خودرو تا دسترسی به خدمات تخصصی",
  },
] as const;

export default function HomeLaunchHero() {
  return (
    <section className="launchHero" aria-labelledby="launchHeroTitle">
      <div className="launchHeroGlow launchHeroGlowOne" aria-hidden="true" />
      <div className="launchHeroGlow launchHeroGlowTwo" aria-hidden="true" />

      <div className="launchHeroCopy">
        <span className="launchHeroEyebrow">
          <i aria-hidden="true" />
          پلتفرم رشد کسب‌وکار خودرو
        </span>

        <h1 id="launchHeroTitle">
          خودرو، نمایشگاه و خدمات؛
          <strong> همه در یک مسیر</strong>
        </h1>

        <p>
          چاکود بازار خودرو را در یک تجربه منظم و حرفه‌ای کنار هم می‌آورد؛ از
          آگهی‌های روز و خودروهای منطقه آزاد تا نمایشگاه‌ها و خدمات تخصصی.
        </p>

        <div className="launchHeroActions">
          <Link className="launchHeroPrimaryAction" href="/cars">
            مشاهده خودروها
            <span aria-hidden="true">←</span>
          </Link>

          <Link
            className="launchHeroSecondaryAction"
            href="/account/listings/new"
          >
            ثبت آگهی خودرو
            <span aria-hidden="true">＋</span>
          </Link>
        </div>

        <ul className="launchHeroFeatures" aria-label="مزیت‌های چاکود">
          {HERO_FEATURES.map((feature) => (
            <li key={feature.title}>
              <span aria-hidden="true">✓</span>
              <div>
                <strong>{feature.title}</strong>
                <small>{feature.description}</small>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="launchHeroVisual" aria-label="بخش‌های اصلی چاکود">
        <div className="launchHeroBrandOrb" aria-hidden="true">
          <span className="launchHeroOrbit launchHeroOrbitOuter" />
          <span className="launchHeroOrbit launchHeroOrbitInner" />
          <img src="/brand/chakod-symbol.png" alt="" />
          <small>CHAKOD</small>
          <strong>پلتفرم رشد کسب‌وکار</strong>
        </div>

        <Link
          className="launchHeroCategoryCard launchHeroCategoryLuxury"
          href="/cars/luxury"
        >
          <span>منتخب چاکود</span>
          <strong>خودروهای لوکس</strong>
          <small>مشاهده ویترین</small>
        </Link>

        <Link
          className="launchHeroCategoryCard launchHeroCategoryFreezone"
          href="/cars/free-zone"
        >
          <span>بازار ویژه</span>
          <strong>منطقه آزاد</strong>
          <small>تازه‌ترین آگهی‌ها</small>
        </Link>

        <Link
          className="launchHeroCategoryCard launchHeroCategoryBusiness"
          href="/businesses"
        >
          <span>شبکه تخصصی</span>
          <strong>خدمات خودرو</strong>
          <small>پیدا کردن کسب‌وکار</small>
        </Link>
      </div>
    </section>
  );
}
