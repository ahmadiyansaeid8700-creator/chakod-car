"use client";

import Link from "next/link";

type IconName =
  | "repair"
  | "parts"
  | "electric"
  | "paint"
  | "oil"
  | "tire"
  | "inspect"
  | "rescue";

type QuickService = {
  title: string;
  subtitle: string;
  href: string;
  icon: IconName;
  tone: string;
};

const services: QuickService[] = [
  { title: "تعمیرگاه‌ها", subtitle: "مکانیک و سرویس", href: "/account?join=repair", icon: "repair", tone: "mint" },
  { title: "لوازم یدکی", subtitle: "قطعات و تجهیزات", href: "/account?join=parts", icon: "parts", tone: "violet" },
  { title: "برق خودرو", subtitle: "دیاگ و برق‌کار", href: "/account?join=electrical", icon: "electric", tone: "amber" },
  { title: "صافکاری و رنگ", subtitle: "بدنه و نقاشی", href: "/account?join=bodywork", icon: "paint", tone: "rose" },
  { title: "تعویض روغن", subtitle: "سرویس دوره‌ای", href: "/account?join=oil", icon: "oil", tone: "orange" },
  { title: "لاستیک و رینگ", subtitle: "فروش و خدمات", href: "/account?join=tire", icon: "tire", tone: "blue" },
  { title: "کارشناسی", subtitle: "فنی و بدنه", href: "/account?join=inspection", icon: "inspect", tone: "teal" },
  { title: "امداد خودرو", subtitle: "خدمات شبانه‌روزی", href: "/account?join=roadside", icon: "rescue", tone: "red" },
];

function ServiceIcon({ name }: { name: IconName }) {
  const common = {
    viewBox: "0 0 24 24",
    width: 27,
    height: 27,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "repair":
      return <svg {...common}><path d="M14.8 5.1a4.2 4.2 0 0 0-5.3 5.2L4.2 15.7 8.3 20l5.4-5.4a4.2 4.2 0 0 0 5.2-5.3l-2.7 2.7-3.1-3.1 2.7-2.8Z" /></svg>;
    case "parts":
      return <svg {...common}><circle cx="12" cy="12" r="3.2" /><path d="M12 3.5v2.1M12 18.4v2.1M20.5 12h-2.1M5.6 12H3.5M18 6l-1.5 1.5M7.5 16.5 6 18M18 18l-1.5-1.5M7.5 7.5 6 6" /></svg>;
    case "electric":
      return <svg {...common}><path d="m13.7 2.8-7.2 10.1h5l-1.2 8.3 7.2-10.1h-5l1.2-8.3Z" /></svg>;
    case "paint":
      return <svg {...common}><path d="M4.8 15.8h14.4l-1.1-4.7a2.2 2.2 0 0 0-2.1-1.7H8a2.2 2.2 0 0 0-2.1 1.7l-1.1 4.7Z" /><path d="M8 18.2h.1M16 18.2h.1M15.7 5.4l2-2M18.8 8l2.2-.2" /></svg>;
    case "oil":
      return <svg {...common}><path d="M8 5.2h8v14H8z" /><path d="M10 5.2V3.5h4v1.7M9.8 10.6h4.4M18 8.1c1.3 1.5 2 2.6 2 3.5a2 2 0 0 1-4 0c0-.9.7-2 2-3.5Z" /></svg>;
    case "tire":
      return <svg {...common}><circle cx="12" cy="12" r="7.5" /><circle cx="12" cy="12" r="3" /><path d="M12 4.5v4.3M12 15.2v4.3M4.5 12h4.3M15.2 12h4.3" /></svg>;
    case "inspect":
      return <svg {...common}><circle cx="10.4" cy="10.4" r="5.4" /><path d="m14.4 14.4 5 5M8.2 10.5l1.4 1.4 3-3" /></svg>;
    case "rescue":
      return <svg {...common}><path d="M5 15.5h14l-1.2-5a2.1 2.1 0 0 0-2-1.6H8.2a2.1 2.1 0 0 0-2 1.6L5 15.5Z" /><path d="M7.5 18h.1M16.5 18h.1M12 3v3M10.1 4.5h3.8" /></svg>;
  }
}

export default function HomeQuickServices() {
  return (
    <section className="quickServices" aria-labelledby="quick-services-title">
      <div className="quickServicesHeading">
        <div>
          <span>دسترسی سریع</span>
          <h2 id="quick-services-title">خدمات پرکاربرد خودرو</h2>
        </div>
        <Link href="/#auto-services">همه خدمات <b aria-hidden="true">←</b></Link>
      </div>

      <div className="quickServicesGrid">
        {services.map((service) => (
          <Link className={`quickServiceCard quickServiceCard--${service.tone}`} href={service.href} key={service.title}>
            <span className="quickServiceIcon"><ServiceIcon name={service.icon} /></span>
            <strong>{service.title}</strong>
            <small>{service.subtitle}</small>
          </Link>
        ))}
      </div>

      <style jsx>{`
        .quickServices {
          width: min(1240px, calc(100% - 32px));
          margin: 12px auto 18px;
        }

        .quickServicesHeading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 12px;
        }

        .quickServicesHeading span {
          display: block;
          margin-bottom: 4px;
          color: #6d28d9;
          font-size: 10px;
          font-weight: 900;
        }

        .quickServicesHeading h2 {
          margin: 0;
          color: #20152f;
          font-size: 20px;
          line-height: 1.5;
        }

        .quickServicesHeading > a {
          min-height: 38px;
          padding: 0 13px;
          border: 1px solid #e5dcf2;
          border-radius: 13px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: #fff;
          color: #4c1d95;
          font-size: 11px;
          font-weight: 900;
          box-shadow: 0 8px 20px rgba(48, 28, 78, .05);
        }

        .quickServicesGrid {
          display: grid;
          grid-template-columns: repeat(8, minmax(0, 1fr));
          gap: 14px;
        }

        .quickServiceCard {
          min-width: 0;
          min-height: 116px;
          padding: 15px 8px 13px;
          border: 1px solid #ebe4f4;
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 7px;
          background: linear-gradient(180deg, #fff 0%, #fbf9ff 100%);
          box-shadow:
            0 13px 34px rgba(39, 23, 62, .06),
            inset 0 1px 0 rgba(255,255,255,.9);
          transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
        }

        .quickServiceCard:hover {
          transform: translateY(-4px);
          border-color: #d9c9ef;
          box-shadow: 0 20px 42px rgba(39, 23, 62, .1);
        }

        .quickServiceIcon {
          width: 51px;
          height: 51px;
          border-radius: 18px;
          display: grid;
          place-items: center;
          color: #6d28d9;
          background: #f1eaff;
          box-shadow: 0 9px 20px rgba(109,40,217,.1);
        }

        .quickServiceCard strong {
          width: 100%;
          overflow: hidden;
          color: #251836;
          font-size: 12px;
          font-weight: 900;
          text-align: center;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .quickServiceCard small {
          width: 100%;
          overflow: hidden;
          color: #877e91;
          font-size: 9px;
          text-align: center;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .quickServiceCard--mint .quickServiceIcon { color: #087f5b; background: #e7fbf3; }
        .quickServiceCard--amber .quickServiceIcon { color: #b66a00; background: #fff3d8; }
        .quickServiceCard--rose .quickServiceIcon { color: #c02668; background: #ffe8f2; }
        .quickServiceCard--orange .quickServiceIcon { color: #c05621; background: #fff0e4; }
        .quickServiceCard--blue .quickServiceIcon { color: #2563eb; background: #eaf1ff; }
        .quickServiceCard--teal .quickServiceIcon { color: #0f766e; background: #e5faf8; }
        .quickServiceCard--red .quickServiceIcon { color: #dc2626; background: #ffebeb; }

        @media (max-width: 980px) {
          .quickServicesGrid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        }

        @media (max-width: 640px) {
          .quickServices {
            width: calc(100% - 20px);
            margin: 8px auto 14px;
          }

          .quickServicesHeading {
            align-items: center;
            margin-bottom: 9px;
          }

          .quickServicesHeading h2 { font-size: 16px; }
          .quickServicesHeading > a { min-height: 34px; padding: 0 10px; font-size: 9px; }

          .quickServicesGrid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 8px;
          }

          .quickServiceCard {
            min-height: 88px;
            padding: 9px 4px;
            border-radius: 18px;
            gap: 5px;
          }

          .quickServiceIcon {
            width: 40px;
            height: 40px;
            border-radius: 14px;
          }

          .quickServiceIcon :global(svg) { width: 21px; height: 21px; }
          .quickServiceCard strong { font-size: 9px; }
          .quickServiceCard small { display: none; }
        }
      `}</style>
    </section>
  );
}
