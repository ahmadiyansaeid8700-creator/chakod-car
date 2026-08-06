import Link from "next/link";

export default function HomeLaunchHero() {
  return (
    <section className="launchHero" aria-labelledby="launchHeroTitle">
      <div className="launchHeroCopy">
        <span className="launchHeroEyebrow">پلتفرم رشد کسب و کار خودرو</span>

        <h1 id="launchHeroTitle">
          خودرو، نمایشگاه و خدمات
          <strong>همه در یک مسیر</strong>
        </h1>

        <p>
          در چاکود خودرو پیدا کن، آگهی ثبت کن و به نمایشگاه ها و خدمات تخصصی
          خودرو دسترسی داشته باش.
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
      </div>

      <div className="launchHeroPanel" aria-label="مسیرهای اصلی چاکود">
        <div className="launchHeroBrand">
          <img src="/brand/chakod-symbol.png" alt="" aria-hidden="true" />
          <div>
            <span>CHAKOD</span>
            <strong>چاکود</strong>
            <small>پلتفرم رشد کسب و کار</small>
          </div>
        </div>

        <nav className="launchHeroLinks" aria-label="دسترسی سریع">
          <Link href="/cars/luxury">
            <span>خودروهای لوکس</span>
            <b aria-hidden="true">←</b>
          </Link>
          <Link href="/cars/free-zone">
            <span>خودروهای منطقه آزاد</span>
            <b aria-hidden="true">←</b>
          </Link>
          <Link href="/businesses">
            <span>خدمات خودرو</span>
            <b aria-hidden="true">←</b>
          </Link>
        </nav>
      </div>
    </section>
  );
}
