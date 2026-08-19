import Link from "next/link";

type BusinessCategory = {
  key: string;
  title: string;
  description: string;
  href: string;
  icon: "showroom" | "workshop" | "service" | "parts";
};

const categories: BusinessCategory[] = [
  {
    key: "showrooms",
    title: "نمایشگاه‌های خودرو",
    description: "خرید، فروش و تعویض خودرو",
    href: "/showrooms",
    icon: "showroom",
  },
  {
    key: "workshops",
    title: "تعمیرگاه‌های خودرو",
    description: "تعمیرات فنی و سرویس تخصصی",
    href: "/businesses?type=workshop",
    icon: "workshop",
  },
  {
    key: "services",
    title: "مراکز خدمات خودرو",
    description: "کارواش، دیتیلینگ، شیشه دودی و کاور",
    href: "/businesses?type=car_service",
    icon: "service",
  },
  {
    key: "parts",
    title: "فروشگاه‌های قطعات",
    description: "قطعات یدکی و لوازم خودرو",
    href: "/businesses?type=parts_store",
    icon: "parts",
  },
];

const popularLinks = [
  ["کارواش و صفرشویی", "/businesses?type=car_service&category=car_wash"],
  ["دیتیلینگ و سرامیک", "/businesses?type=car_service&category=detailing"],
  ["شیشه دودی", "/businesses?type=car_service&category=window_tint"],
  ["کاور و PPF", "/businesses?type=car_service&category=ppf"],
  ["سیستم صوتی و دزدگیر", "/businesses?type=car_service&category=car_accessories"],
] as const;

function CategoryIcon({ name }: { name: BusinessCategory["icon"] }) {
  const common = {
    viewBox: "0 0 24 24",
    width: 23,
    height: 23,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "showroom") {
    return (
      <svg {...common}>
        <path d="M4 10.5V20h16v-9.5M3 10.5h18L19 4H5l-2 6.5Z" />
        <path d="M8 20v-5h8v5" />
      </svg>
    );
  }

  if (name === "workshop") {
    return (
      <svg {...common}>
        <path d="M14.8 5.1a4.2 4.2 0 0 0-5.3 5.2L4.2 15.7 8.3 20l5.4-5.4a4.2 4.2 0 0 0 5.2-5.3l-2.7 2.7-3.1-3.1 2.7-2.8Z" />
      </svg>
    );
  }

  if (name === "service") {
    return (
      <svg {...common}>
        <path d="M5 15.8h14l-1.1-4.7a2.2 2.2 0 0 0-2.1-1.7H8.2a2.2 2.2 0 0 0-2.1 1.7L5 15.8Z" />
        <path d="M8 18.2h.1M16 18.2h.1M7.2 4.8l-.8 1.3M12 3.8v1.5M16.8 4.8l.8 1.3" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M12 3.5v2M12 18.5v2M20.5 12h-2M5.5 12h-2M18 6l-1.4 1.4M7.4 16.6 6 18M18 18l-1.4-1.4M7.4 7.4 6 6" />
    </svg>
  );
}

export default function HomeBusinessDirectory() {
  return (
    <section className="homeBusinessDirectory" id="businesses" dir="rtl">
      <div className="homeBusinessDirectoryHeader">
        <div>
          <span>خدمات و کسب‌وکارهای نزدیک شما</span>
          <h2>هر چیزی که خودروی شما نیاز دارد</h2>
          <p>
            نمایشگاه، تعمیرگاه، مرکز خدمات و فروشگاه قطعات را در محدوده خود پیدا کنید.
          </p>
        </div>

        <Link href="/businesses">مشاهده همه کسب‌وکارها</Link>
      </div>

      <div className="homeBusinessCategoryGrid" aria-label="دسته‌بندی کسب‌وکارهای خودرو">
        {categories.map((category) => (
          <Link className="homeBusinessCategoryCard" href={category.href} key={category.key}>
            <span className="homeBusinessCategoryIcon">
              <CategoryIcon name={category.icon} />
            </span>
            <span className="homeBusinessCategoryCopy">
              <strong>{category.title}</strong>
              <small>{category.description}</small>
            </span>
            <b aria-hidden="true">←</b>
          </Link>
        ))}
      </div>

      <div className="homeBusinessPopularLinks" aria-label="خدمات محبوب خودرو">
        {popularLinks.map(([title, href]) => (
          <Link href={href} key={title}>
            {title}
          </Link>
        ))}
      </div>

      <style>{`
        .homeBusinessDirectory {
          width: min(1240px, calc(100% - 32px));
          margin: 8px auto 0;
          padding: 30px 28px;
          border: 1px solid #e9e0f3;
          border-radius: 28px;
          background:
            radial-gradient(circle at 96% 4%, rgba(124, 58, 237, 0.08), transparent 19rem),
            linear-gradient(145deg, #ffffff 0%, #fbf8ff 100%);
          box-shadow: 0 18px 45px rgba(54, 35, 82, 0.07);
        }

        .homeBusinessDirectoryHeader {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 20px;
        }

        .homeBusinessDirectoryHeader span {
          display: block;
          margin-bottom: 5px;
          color: #6d28d9;
          font-size: 10px;
          font-weight: 950;
        }

        .homeBusinessDirectoryHeader h2 {
          margin: 0;
          color: #21152f;
          font-size: clamp(23px, 2.2vw, 34px);
          line-height: 1.5;
        }

        .homeBusinessDirectoryHeader p {
          margin: 7px 0 0;
          color: #82788d;
          font-size: 12px;
          line-height: 1.9;
        }

        .homeBusinessDirectoryHeader > a {
          min-height: 40px;
          padding: 0 15px;
          border: 1px solid #ddcff0;
          border-radius: 13px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
          background: #ffffff;
          color: #4c1d95;
          font-size: 11px;
          font-weight: 900;
          box-shadow: 0 8px 20px rgba(66, 38, 103, 0.05);
        }

        .homeBusinessCategoryGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 11px;
        }

        .homeBusinessCategoryCard {
          min-width: 0;
          min-height: 82px;
          padding: 13px 14px;
          border: 1px solid #e8def2;
          border-radius: 17px;
          display: grid;
          grid-template-columns: 46px minmax(0, 1fr) 18px;
          align-items: center;
          gap: 10px;
          background: rgba(255, 255, 255, 0.9);
          color: #251735;
          box-shadow: 0 10px 26px rgba(50, 31, 74, 0.045);
          transition: transform 170ms ease, border-color 170ms ease, box-shadow 170ms ease;
        }

        .homeBusinessCategoryCard:hover {
          transform: translateY(-3px);
          border-color: #d8c4ee;
          box-shadow: 0 16px 32px rgba(50, 31, 74, 0.08);
        }

        .homeBusinessCategoryIcon {
          width: 46px;
          height: 46px;
          border-radius: 15px;
          display: grid;
          place-items: center;
          color: #ffffff;
          background: linear-gradient(145deg, #7c3aed, #6d28d9);
          box-shadow: 0 10px 22px rgba(109, 40, 217, 0.18);
        }

        .homeBusinessCategoryCopy {
          min-width: 0;
        }

        .homeBusinessCategoryCopy strong,
        .homeBusinessCategoryCopy small {
          display: block;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .homeBusinessCategoryCopy strong {
          margin-bottom: 5px;
          font-size: 12px;
          font-weight: 950;
        }

        .homeBusinessCategoryCopy small {
          color: #8c8394;
          font-size: 8px;
          line-height: 1.8;
        }

        .homeBusinessCategoryCard > b {
          color: #8b5fc5;
          font-size: 18px;
          font-weight: 500;
        }

        .homeBusinessPopularLinks {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 12px;
        }

        .homeBusinessPopularLinks a {
          min-height: 30px;
          padding: 0 11px;
          border: 1px solid #e9e0f1;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #f5f0fa;
          color: #5f4777;
          font-size: 9px;
          font-weight: 800;
        }

        @media (max-width: 960px) {
          .homeBusinessCategoryGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .homeBusinessDirectory {
            width: calc(100% - 20px);
            padding: 18px 14px;
            border-radius: 22px;
          }

          .homeBusinessDirectoryHeader {
            align-items: flex-start;
            flex-direction: column;
            gap: 11px;
            margin-bottom: 13px;
          }

          .homeBusinessDirectoryHeader h2 {
            font-size: 20px;
          }

          .homeBusinessDirectoryHeader p {
            font-size: 9px;
          }

          .homeBusinessDirectoryHeader > a {
            min-height: 34px;
            padding: 0 11px;
            font-size: 9px;
          }

          .homeBusinessCategoryGrid {
            grid-template-columns: 1fr;
            gap: 8px;
          }

          .homeBusinessCategoryCard {
            min-height: 70px;
            padding: 10px 11px;
            grid-template-columns: 40px minmax(0, 1fr) 16px;
            border-radius: 15px;
          }

          .homeBusinessCategoryIcon {
            width: 40px;
            height: 40px;
            border-radius: 13px;
          }

          .homeBusinessCategoryIcon :global(svg) {
            width: 20px;
            height: 20px;
          }

          .homeBusinessCategoryCopy strong {
            font-size: 11px;
          }

          .homeBusinessPopularLinks {
            overflow-x: auto;
            flex-wrap: nowrap;
            padding-bottom: 3px;
            scrollbar-width: none;
          }

          .homeBusinessPopularLinks::-webkit-scrollbar {
            display: none;
          }

          .homeBusinessPopularLinks a {
            flex: 0 0 auto;
            font-size: 8px;
          }
        }
      `}</style>
    </section>
  );
}
