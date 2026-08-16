"use client";

import Link from "next/link";

function TrustCard({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="trustCard" aria-label={`${title}؛ ${subtitle}`}>
      <span className="trustCardMark">✓</span>
      <div><strong>{title}</strong><small>{subtitle}</small></div>
    </div>
  );
}

export default function HomeFooter() {
  return (
    <footer className="homeFooter">
      <div className="homeFooterGlow" aria-hidden="true" />
      <div className="homeFooterMain">
        <div className="homeFooterBrand">
          <Link href="/" aria-label="صفحه اصلی چاکود"><img src="/brand/chakod-logo-full-light.png" alt="چاکود" /></Link>
          <h2>چاکود؛ بازار هوشمند خودرو و خدمات خودرویی</h2>
          <p>
            چاکود خودروها، نمایشگاه‌ها، تعمیرگاه‌ها و فروشگاه‌های لوازم یدکی را در یک تجربه یکپارچه کنار هم قرار می‌دهد؛ تا خریدار سریع‌تر انتخاب کند و کسب‌وکار حرفه‌ای‌تر دیده شود.
          </p>
          <div className="homeFooterTrusts">
            <TrustCard title="اینماد" subtitle="پس از اتصال رسمی" />
            <TrustCard title="زرین‌پال" subtitle="پس از فعال‌سازی درگاه" />
          </div>
        </div>

        <div className="homeFooterColumns">
          <div><h3>بازار خودرو</h3><Link href="/cars">همه آگهی‌ها</Link><Link href="/cars/luxury">خودروهای لوکس</Link><Link href="/cars/free-zone">منطقه آزاد</Link><Link href="/cars?segment=economic">اقتصادی</Link></div>
          <div><h3>کسب‌وکارها</h3><Link href="/dealerships">نمایشگاه‌ها</Link><Link href="/account?join=repair">عضویت تعمیرگاه</Link><Link href="/account?join=parts">عضویت فروشگاه</Link><Link href="/#auto-services">خدمات خودرو</Link></div>
          <div><h3>چاکود</h3><Link href="/account/listings/new">ثبت آگهی</Link><Link href="/account">حساب کاربری</Link><Link href="/rules">قوانین و مقررات</Link><Link href="/rules">حریم خصوصی</Link></div>
        </div>
      </div>

      <div className="homeFooterBottom">
        <span>© تمامی حقوق برای چاکود محفوظ است.</span>
        <span>تاریخ ثبت شرکت: ۱۳۹۴</span>
        <span>پلتفرم رشد کسب‌وکار و بازار خودرو</span>
      </div>

      <style jsx>{`
        .homeFooter { position:relative; margin-top:30px; overflow:hidden; color:#fff; background:linear-gradient(145deg,#13091f 0%,#201033 52%,#281148 100%); border-top:1px solid rgba(255,255,255,.08); }
        .homeFooterGlow { position:absolute; width:420px; height:420px; top:-250px; right:-80px; border-radius:50%; background:rgba(124,58,237,.22); filter:blur(12px); pointer-events:none; }
        .homeFooterMain { position:relative; width:min(1240px,calc(100% - 32px)); margin:0 auto; padding:42px 0 30px; display:grid; grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr); gap:48px; }
        .homeFooterBrand img { display:block; width:190px; max-width:100%; height:auto; margin-bottom:17px; }
        .homeFooterBrand h2 { margin:0 0 9px; font-size:20px; line-height:1.6; }
        .homeFooterBrand p { margin:0; max-width:630px; color:rgba(255,255,255,.76); font-size:13px; line-height:2.1; }
        .homeFooterTrusts { display:flex; gap:10px; margin-top:20px; flex-wrap:wrap; }
        .trustCard { min-width:150px; min-height:62px; padding:9px 11px; border:1px solid rgba(255,255,255,.1); border-radius:17px; display:flex; align-items:center; gap:10px; background:rgba(255,255,255,.07); }
        .trustCardMark { width:38px; height:38px; border-radius:13px; display:grid; place-items:center; color:#1d1530; background:#fff; font-weight:900; }
        .trustCard strong,.trustCard small { display:block; }
        .trustCard strong { margin-bottom:3px; font-size:11px; }
        .trustCard small { color:rgba(255,255,255,.58); font-size:8px; }
        .homeFooterColumns { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:25px; }
        .homeFooterColumns h3 { margin:0 0 15px; font-size:13px; }
        .homeFooterColumns a { display:block; margin-bottom:10px; color:rgba(255,255,255,.7); font-size:11px; line-height:1.7; transition:color 160ms ease,transform 160ms ease; }
        .homeFooterColumns a:hover { color:#fff; transform:translateX(-2px); }
        .homeFooterBottom { position:relative; width:min(1240px,calc(100% - 32px)); min-height:58px; margin:0 auto; border-top:1px solid rgba(255,255,255,.08); display:flex; align-items:center; justify-content:space-between; gap:16px; color:rgba(255,255,255,.48); font-size:10px; }
        @media(max-width:760px){
          .homeFooter{margin-top:18px;}
          .homeFooterMain,.homeFooterBottom{width:calc(100% - 24px);}
          .homeFooterMain{padding:26px 0 20px; grid-template-columns:1fr; gap:24px;}
          .homeFooterBrand img{width:150px;}
          .homeFooterBrand h2{font-size:16px;}
          .homeFooterBrand p{font-size:11px; line-height:2;}
          .homeFooterTrusts{gap:8px;}
          .trustCard{min-width:calc(50% - 4px); min-height:58px; border-radius:15px;}
          .homeFooterColumns{grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px;}
          .homeFooterColumns h3{font-size:10px;}
          .homeFooterColumns a{margin-bottom:8px; font-size:8px;}
          .homeFooterBottom{min-height:142px; padding-bottom:72px; flex-direction:column; align-items:flex-start; justify-content:center; gap:5px;}
        }
      `}</style>
    </footer>
  );
}
