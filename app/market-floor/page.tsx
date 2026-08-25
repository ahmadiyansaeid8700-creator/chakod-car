"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  DEFAULT_HOME_LOCATION,
  HOME_LOCATION_EVENT,
  getHomeLocationScopes,
  loadHomeLocation,
  type HomeLocationSelection,
} from "../components/home-location";
import MobileBottomNav from "../components/MobileBottomNav";
import styles from "./page.module.css";

type Item = { id: number; score: number; province: string; reason: string; cycleEndsAt: string; listing: { id: number; title: string; brand: string; model: string; year: number; mileageKm?: number; priceToman: number; coverUrl?: string; publicUrl: string } };

function toFa(value: number | string) { return String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]); }
function formatPrice(value: number) {
  if (!value) return "قیمت توافقی";
  if (value >= 1_000_000_000) return `${toFa((value / 1_000_000_000).toLocaleString("fa-IR", { maximumFractionDigits: 2 }))} میلیارد تومان`;
  return `${toFa(Math.round(value / 1_000_000).toLocaleString("fa-IR"))} میلیون تومان`;
}
function remainingTime(endsAt?: string) {
  const totalSeconds = endsAt ? Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000)) : 24 * 60 * 60;
  return {
    hours: toFa(String(Math.floor(totalSeconds / 3600)).padStart(2, "0")),
    minutes: toFa(String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0")),
    seconds: toFa(String(totalSeconds % 60).padStart(2, "0")),
  };
}
function normalizeText(value: string) { return String(value || "").trim().replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/[\s‌]+/g, "").toLocaleLowerCase("fa"); }

export default function MarketFloorPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<HomeLocationSelection>(DEFAULT_HOME_LOCATION);
  const [clock, setClock] = useState(0);

  useEffect(() => {
    fetch("/api/market-floor/public", { cache: "no-store" }).then((response) => response.json()).then((data) => {
      setItems(data.success && Array.isArray(data.data) ? data.data : []);
    }).catch(() => setItems([])).finally(() => setLoading(false));
  }, []);
  useEffect(() => { const timer = window.setInterval(() => setClock((value) => value + 1), 1_000); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    setLocation(loadHomeLocation());
    const sync = (event: Event) => setLocation((event as CustomEvent<HomeLocationSelection>).detail || loadHomeLocation());
    window.addEventListener(HOME_LOCATION_EVENT, sync);
    return () => window.removeEventListener(HOME_LOCATION_EVENT, sync);
  }, []);

  const localProvinces = useMemo(() => new Set(getHomeLocationScopes(location).map((scope) => normalizeText(scope.province))), [location]);
  const localItems = useMemo(() => location.mode === "all" ? items : items.filter((item) => localProvinces.has(normalizeText(item.province))), [items, localProvinces, location.mode]);
  const nationwideItems = useMemo(() => location.mode === "all" ? [] : items.filter((item) => !localProvinces.has(normalizeText(item.province))), [items, localProvinces, location.mode]);
  const showNationwide = location.mode !== "all" && localItems.length < 10 && nationwideItems.length > 0;
  const cards = (values: Item[], offset = 0) => values.map((item, index) => {
    const countdown = remainingTime(item.cycleEndsAt);
    return <Link href={item.listing.publicUrl} key={item.id} className={styles.carCard}>
    <div className={styles.cardMedia}>{item.listing.coverUrl ? <img src={item.listing.coverUrl} alt={item.listing.title} /> : <div className={styles.noImage}><span>چاکود</span><small>تصویر خودرو</small></div>}<span className={styles.rankBadge}>انتخاب {toFa(offset + index + 1)}</span><span className={styles.cardTimer} dir="ltr" aria-label="زمان باقی‌مانده نمایش"><small>مانده</small><b>{countdown.hours}:{countdown.minutes}:{countdown.seconds}</b></span><span className={styles.scoreBadge}><b>{toFa(item.score)}</b><small>امتیاز</small></span></div>
    <div className={styles.cardContent}><span className={styles.location}>⌖ {item.province}</span><h3>{item.listing.title}</h3><div className={styles.facts}>{item.listing.year ? <span><small>مدل</small><b>{toFa(item.listing.year)}</b></span> : null}{item.listing.mileageKm ? <span><small>کارکرد</small><b>{toFa(item.listing.mileageKm.toLocaleString("fa-IR"))} کیلومتر</b></span> : null}</div><p className={styles.reason}>{item.reason}</p><footer><strong>{formatPrice(item.listing.priceToman)}</strong><span>دیدن خودرو ←</span></footer></div>
  </Link>;
  });

  return <main dir="rtl" className={styles.page}>
    <section className={styles.hero}>
      <button type="button" className={styles.backButton} aria-label="بازگشت به صفحه قبل" title="بازگشت" onClick={() => window.history.length > 1 ? router.back() : router.push("/")}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
      </button>
      <div className={styles.heroCopy}>
        <h1>کف بازار چاکود</h1>
        <p>ویترین محدود خودروهایی که قیمت، شرایط و کیفیت آگهی آن‌ها بررسی شده است؛ بدون تکمیل اجباری ظرفیت و بدون ادعای تخفیف نمایشی.</p>
        <div className={styles.heroActions}><Link href="/account/market-floor" className={styles.primaryAction}>شرکت در کف بازار <span>←</span></Link></div>
      </div>
      <div className={styles.heroVisual}>
        {items[0]?.listing.coverUrl ? <img src={items[0].listing.coverUrl} alt="" /> : <div className={styles.visualFallback}><img src="/brand/chakod-symbol.png" alt="" /><span>CHAKOD</span><strong>MARKET FLOOR</strong></div>}
        <div className={styles.visualShade} />
        <span className={styles.aiSeal}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 12 3 3 7-7"/><circle cx="12" cy="12" r="9"/></svg><b>ارزیابی هوشمند</b><small>نمایش مستقل ۲۴ ساعته</small></span>
      </div>
      <div className={styles.heroStats}>
        <div><small>فرصت‌های امروز</small><strong>{loading ? "…" : toFa(items.length)}</strong></div>
        <div><small>سقف هر استان</small><strong>۱۰ خودرو</strong></div>
      </div>
    </section>

    <section id="today-market" className={styles.marketBody}>
      <header className={styles.sectionHeader}><div><span>ویترین فعال کف بازار</span><h2>{location.mode === "all" ? "فرصت‌های کف بازار" : `فرصت‌های ${location.label}`}</h2></div><p><i /> هر خودرو از زمان ورود، ۲۴ ساعت مستقل نمایش داده می‌شود.</p></header>
      {!loading && location.mode !== "all" && localItems.length === 0 ? <div className={styles.noLocalNotice}><i>!</i><span><strong>در {location.label} فعلاً پیشنهاد تأییدشده‌ای نیست</strong><small>آگهی‌های این محدوده هنوز حداقل امتیاز قیمت، شرایط و کیفیت کف بازار را نگرفته‌اند.</small></span></div> : null}
      <div className={styles.showcaseBoard} aria-label="ویترین آگهی‌های کف بازار">
        {loading ? <div className={styles.showcaseGrid} aria-label="در حال بارگذاری">{[1, 2, 3, 4].map((item) => <div className={styles.skeleton} key={item}><i /><span /><b /></div>)}</div> : <div className={styles.showcaseGrid} key={clock}>
          {cards(localItems)}
          {showNationwide ? <div className={styles.nationwideSeparator}><i /><span><small>{localItems.length ? "ادامه ویترین" : "خارج از محدوده انتخابی"}</small><strong>پیشنهادهای سراسر ایران</strong></span><i /></div> : null}
          {showNationwide ? cards(nationwideItems, localItems.length) : null}
          {!localItems.length && !showNationwide ? [1, 2, 3, 4].map((slot) => <span className={styles.emptySlot} aria-hidden="true" key={slot} />) : null}
        </div>}
      </div>
    </section>

    <section className={styles.marketRules}>
      <div><span>۱</span><strong>آگهی وارد بررسی می‌شود</strong><small>قیمت، کارکرد، بدنه و کیفیت اطلاعات</small></div><i />
      <div><span>۲</span><strong>هوش چاکود امتیاز می‌دهد</strong><small>بدون تأیید صرفاً به‌خاطر قیمت پایین</small></div><i />
      <div><span>۳</span><strong>بهترین‌ها وارد ویترین می‌شوند</strong><small>حداکثر ۱۰ فرصت واقعی از هر استان</small></div>
    </section>
    <MobileBottomNav />
  </main>;
}
