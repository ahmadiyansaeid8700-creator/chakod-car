"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import styles from "./page.module.css";

type Item = { id: number; score: number; province: string; reason: string; listing: { id: number; title: string; brand: string; model: string; year: number; mileageKm?: number; priceToman: number; coverUrl?: string; publicUrl: string } };
type Cycle = { startsAt: string; endsAt: string };

function toFa(value: number | string) { return String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]); }
function formatPrice(value: number) {
  if (!value) return "قیمت توافقی";
  if (value >= 1_000_000_000) return `${toFa((value / 1_000_000_000).toLocaleString("fa-IR", { maximumFractionDigits: 2 }))} میلیارد تومان`;
  return `${toFa(Math.round(value / 1_000_000).toLocaleString("fa-IR"))} میلیون تومان`;
}
function remainingTime(endsAt?: string) {
  if (!endsAt) return "چرخه امروز";
  const minutes = Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 60_000));
  return `${toFa(Math.floor(minutes / 60))} ساعت و ${toFa(minutes % 60)} دقیقه`;
}

export default function MarketFloorPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProvince, setSelectedProvince] = useState("همه ایران");
  const [clock, setClock] = useState(0);

  useEffect(() => {
    fetch("/api/market-floor/public", { cache: "no-store" }).then((response) => response.json()).then((data) => {
      setItems(data.success && Array.isArray(data.data) ? data.data : []);
      setCycle(data.success ? data.cycle : null);
    }).catch(() => setItems([])).finally(() => setLoading(false));
  }, []);
  useEffect(() => { const timer = window.setInterval(() => setClock((value) => value + 1), 60_000); return () => window.clearInterval(timer); }, []);

  const provinces = useMemo(() => ["همه ایران", ...Array.from(new Set(items.map((item) => item.province).filter(Boolean)))], [items]);
  const visibleItems = selectedProvince === "همه ایران" ? items : items.filter((item) => item.province === selectedProvince);

  return <main dir="rtl" className={styles.page}>
    <section className={styles.hero}>
      <div className={styles.heroGlow} />
      <div className={styles.marketSign} aria-hidden="true"><span>کف</span><b>بازار</b></div>
      <div className={styles.heroCopy}>
        <span className={styles.eyebrow}><i /> بازار زنده فرصت‌های واقعی</span>
        <h1>بزن بریم کف بازار!</h1>
        <p>اینجا قیمت نمایشی نداریم؛ فقط خودروهایی وارد ویترین می‌شوند که قیمت، شرایط و کیفیت آگهی‌شان از بررسی هوشمند چاکود عبور کرده باشد.</p>
        <div className={styles.heroActions}><a href="#today-market" className={styles.primaryAction}>گشتن بین فرصت‌ها <span>↓</span></a><Link href="/account/market-floor" className={styles.secondaryAction}>آگهی من هم بررسی شود</Link></div>
      </div>
      <div className={styles.marketScene} aria-hidden="true"><div className={styles.awning}><i /><i /><i /><i /><i /></div><div className={styles.carShape}><span /><b /><i /><em /></div><div className={styles.priceTag}><small>فرصت امروز</small><strong>تأیید هوشمند</strong></div></div>
      <div className={styles.heroStats}>
        <div><small>فرصت‌های امروز</small><strong>{loading ? "…" : toFa(items.length)}</strong></div>
        <div><small>سقف هر استان</small><strong>۱۰ خودرو</strong></div>
        <div><small>مانده تا پایان چرخه</small><strong key={clock}>{remainingTime(cycle?.endsAt)}</strong></div>
      </div>
    </section>

    <section className={styles.marketNav} aria-label="راسته‌های کف بازار">
      <div><small>راسته‌های امروز</small><strong>فرصت‌ها را بر اساس استان ببین</strong></div>
      <div className={styles.provinceRail}>{provinces.map((province) => <button type="button" key={province} className={selectedProvince === province ? styles.activeProvince : ""} onClick={() => setSelectedProvince(province)}><span>{province === "همه ایران" ? "⌖" : "●"}</span>{province}</button>)}</div>
    </section>

    <section id="today-market" className={styles.marketBody}>
      <header className={styles.sectionHeader}><div><span>ویترین چرخه امروز</span><h2>{selectedProvince === "همه ایران" ? "فرصت‌های کف بازار" : `فرصت‌های ${selectedProvince}`}</h2></div><p><i /> هر کارت پس از ارزیابی قیمت و کیفیت نمایش داده می‌شود.</p></header>
      {loading ? <div className={styles.cardGrid} aria-label="در حال بارگذاری">{[1, 2, 3].map((item) => <div className={styles.skeleton} key={item}><i /><span /><b /></div>)}</div> : visibleItems.length ? <div className={styles.cardGrid}>
        {visibleItems.map((item, index) => <Link href={item.listing.publicUrl} key={item.id} className={styles.carCard}>
          <div className={styles.cardMedia}>{item.listing.coverUrl ? <img src={item.listing.coverUrl} alt={item.listing.title} /> : <div className={styles.noImage}><span>چاکود</span><small>تصویر خودرو</small></div>}<span className={styles.rankBadge}>انتخاب {toFa(index + 1)}</span><span className={styles.scoreBadge}><b>{toFa(item.score)}</b><small>امتیاز</small></span></div>
          <div className={styles.cardContent}><span className={styles.location}>⌖ {item.province}</span><h3>{item.listing.title}</h3><div className={styles.facts}>{item.listing.year ? <span><small>مدل</small><b>{toFa(item.listing.year)}</b></span> : null}{item.listing.mileageKm ? <span><small>کارکرد</small><b>{toFa(item.listing.mileageKm.toLocaleString("fa-IR"))} کیلومتر</b></span> : null}</div><p className={styles.reason}>{item.reason}</p><footer><strong>{formatPrice(item.listing.priceToman)}</strong><span>دیدن خودرو ←</span></footer></div>
        </Link>)}
      </div> : <div className={styles.emptyMarket}>
        <div className={styles.emptyStalls} aria-hidden="true">{["قیمت واقعی", "شرایط مناسب", "آگهی کامل"].map((label) => <div key={label}><span /><b>{label}</b></div>)}</div>
        <div className={styles.emptyCopy}><span>ویترین امروز در حال چیده‌شدن است</span><h2>{selectedProvince === "همه ایران" ? "هنوز خودرویی از فیلتر کف بازار عبور نکرده" : `هنوز فرصتی برای ${selectedProvince} تأیید نشده`}</h2><p>برای شلوغ نشان‌دادن بازار، آگهی ضعیف وارد نمی‌کنیم. به‌محض تأیید یک فرصت واقعی، همین‌جا در ویترین قرار می‌گیرد.</p><div><Link href="/cars">گشتن در بازار خودرو</Link><Link href="/account/market-floor">بررسی آگهی من</Link></div></div>
      </div>}
    </section>

    <section className={styles.marketRules}>
      <div><span>۱</span><strong>آگهی وارد بررسی می‌شود</strong><small>قیمت، کارکرد، بدنه و کیفیت اطلاعات</small></div><i />
      <div><span>۲</span><strong>هوش چاکود امتیاز می‌دهد</strong><small>بدون تأیید صرفاً به‌خاطر قیمت پایین</small></div><i />
      <div><span>۳</span><strong>بهترین‌ها وارد ویترین می‌شوند</strong><small>حداکثر ۱۰ فرصت واقعی از هر استان</small></div>
    </section>
  </main>;
}
