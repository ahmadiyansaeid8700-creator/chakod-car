import Link from "next/link";

type Guide = {
  title: string;
  description: string;
  href: string;
  icon: string;
};

const guides: Guide[] = [
  {
    title: "پیدا کردن خودروی مناسب",
    description: "بازار خودرو را با جست‌وجوی برند، مدل و محدوده بررسی کن.",
    href: "/ads/all",
    icon: "⌕",
  },
  {
    title: "خودروهای لوکس و خاص",
    description: "منتخب خودروهای ممتاز و آگهی‌های باکیفیت را ببین.",
    href: "/ads/luxury",
    icon: "✦",
  },
  {
    title: "خودروهای منطقه آزاد",
    description: "آگهی‌های منطقه آزاد را در ویترین اختصاصی مقایسه کن.",
    href: "/ads/freezone",
    icon: "◇",
  },
  {
    title: "خدمات و نگهداری خودرو",
    description: "تعمیرگاه، مرکز خدمات و فروشگاه قطعات نزدیکت را پیدا کن.",
    href: "/businesses",
    icon: "⌁",
  },
];

export default function HomeGuides() {
  return (
    <section className="homeGuides" dir="rtl">
      <div className="homeGuidesHeader">
        <div>
          <span>مقالات و راهنماها</span>
          <h2>مسیرهای کاربردی چاکود</h2>
        </div>
      </div>

      <div className="homeGuidesGrid">
        {guides.map((guide) => (
          <Link href={guide.href} className="homeGuideCard" key={guide.title}>
            <span aria-hidden="true">{guide.icon}</span>
            <strong>{guide.title}</strong>
            <small>{guide.description}</small>
            <b aria-hidden="true">←</b>
          </Link>
        ))}
      </div>

      <style>{`
        .homeGuides {
          width: min(1240px, calc(100% - 32px));
          margin: 0 auto 28px;
          padding: 22px 0 0;
          font-family: Tahoma, Arial, sans-serif;
        }

        .homeGuidesHeader {
          margin-bottom: 13px;
        }

        .homeGuidesHeader span {
          color: #6d28d9;
          font-size: 9px;
          font-weight: 950;
        }

        .homeGuidesHeader h2 {
          margin: 4px 0 0;
          color: #21152f;
          font-size: clamp(20px, 1.9vw, 28px);
        }

        .homeGuidesGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .homeGuideCard {
          min-width: 0;
          min-height: 146px;
          padding: 17px;
          border: 1px solid #e8def1;
          border-radius: 19px;
          display: grid;
          grid-template-columns: 38px minmax(0, 1fr) 18px;
          grid-template-rows: auto auto 1fr;
          column-gap: 10px;
          align-items: start;
          color: #251735;
          background: #ffffff;
          box-shadow: 0 11px 28px rgba(48, 30, 70, 0.045);
          transition: transform 170ms ease, border-color 170ms ease, box-shadow 170ms ease;
        }

        .homeGuideCard:hover {
          transform: translateY(-3px);
          border-color: #d3c0e8;
          box-shadow: 0 17px 35px rgba(48, 30, 70, 0.085);
        }

        .homeGuideCard > span {
          width: 38px;
          height: 38px;
          grid-row: 1 / span 2;
          border-radius: 13px;
          display: grid;
          place-items: center;
          color: #6d28d9;
          background: #f3edff;
          font-size: 17px;
          font-weight: 950;
        }

        .homeGuideCard > strong {
          padding-top: 2px;
          font-size: 12px;
          font-weight: 950;
        }

        .homeGuideCard > small {
          grid-column: 2 / 4;
          margin-top: 8px;
          color: #81758b;
          font-size: 8px;
          line-height: 1.9;
        }

        .homeGuideCard > b {
          grid-column: 3;
          grid-row: 1;
          color: #8b5fc5;
          font-size: 18px;
          font-weight: 500;
        }

        @media (max-width: 900px) {
          .homeGuidesGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .homeGuides {
            width: calc(100% - 20px);
            margin-bottom: 18px;
            padding-top: 14px;
          }

          .homeGuidesHeader h2 {
            font-size: 18px;
          }

          .homeGuidesGrid {
            grid-template-columns: none;
            grid-auto-flow: column;
            grid-auto-columns: min(77vw, 280px);
            overflow-x: auto;
            padding-bottom: 4px;
            scrollbar-width: none;
            scroll-snap-type: x mandatory;
          }

          .homeGuidesGrid::-webkit-scrollbar {
            display: none;
          }

          .homeGuideCard {
            min-height: 126px;
            padding: 14px;
            scroll-snap-align: start;
          }
        }
      `}</style>
    </section>
  );
}
