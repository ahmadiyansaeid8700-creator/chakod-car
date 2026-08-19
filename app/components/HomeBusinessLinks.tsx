import Link from "next/link";

type CardIcon = "service" | "parts";

type BusinessLinkCard = {
  key: string;
  title: string;
  description: string;
  href: string;
  icon: CardIcon;
  meta: string[];
};

const cards: BusinessLinkCard[] = [
  {
    key: "services",
    title: "خدمات خودرو",
    description:
      "کارواش، دیتیلینگ، شیشه دودی، کاور، سرامیک و خدمات تخصصی نزدیک خودت را پیدا کن.",
    href: "/businesses?type=car_service",
    icon: "service",
    meta: ["کارواش", "دیتیلینگ", "شیشه دودی", "کاور و PPF"],
  },
  {
    key: "parts",
    title: "قطعات و لوازم خودرو",
    description:
      "فروشگاه‌های قطعات یدکی، لاستیک، باتری و لوازم جانبی معتبر را ببین.",
    href: "/businesses?type=parts_store",
    icon: "parts",
    meta: ["قطعات یدکی", "لاستیک و رینگ", "باتری", "لوازم جانبی"],
  },
];

function CardIconGraphic({ name }: { name: CardIcon }) {
  const common = {
    viewBox: "0 0 24 24",
    width: 26,
    height: 26,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "service") {
    return (
      <svg {...common}>
        <path d="M14.8 5.1a4.2 4.2 0 0 0-5.3 5.2L4.2 15.7 8.3 20l5.4-5.4a4.2 4.2 0 0 0 5.2-5.3l-2.7 2.7-3.1-3.1 2.7-2.8Z" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3.5v2M12 18.5v2M20.5 12h-2M5.5 12h-2M18 6l-1.4 1.4M7.4 16.6 6 18M18 18l-1.4-1.4M7.4 7.4 6 6" />
    </svg>
  );
}

export default function HomeBusinessLinks() {
  return (
    <section className="homeBusinessLinks" id="businesses" dir="rtl">
      <div className="homeBusinessLinksHeader">
        <div>
          <span>خدمات و قطعات نزدیک شما</span>
          <h2>بعد از انتخاب خودرو، بقیه مسیر را هم در چاکود پیدا کن</h2>
        </div>

        <Link href="/businesses">مشاهده همه کسب‌وکارها</Link>
      </div>

      <div className="homeBusinessLinksGrid">
        {cards.map((card) => (
          <Link
            className={`homeBusinessLinkCard homeBusinessLinkCard--${card.key}`}
            href={card.href}
            key={card.key}
          >
            <span className="homeBusinessLinkIcon">
              <CardIconGraphic name={card.icon} />
            </span>

            <span className="homeBusinessLinkCopy">
              <strong>{card.title}</strong>
              <small>{card.description}</small>
              <span className="homeBusinessLinkMeta">
                {card.meta.map((item) => (
                  <em key={item}>{item}</em>
                ))}
              </span>
            </span>

            <b aria-hidden="true">←</b>
          </Link>
        ))}
      </div>

      <style>{`
        .homeBusinessLinks {
          width: min(1240px, calc(100% - 32px));
          margin: 12px auto 26px;
          padding: 28px;
          border: 1px solid #e9e0f3;
          border-radius: 28px;
          background:
            radial-gradient(circle at 96% 0%, rgba(124, 58, 237, 0.08), transparent 20rem),
            linear-gradient(145deg, #ffffff 0%, #fbf8ff 100%);
          box-shadow: 0 18px 45px rgba(54, 35, 82, 0.07);
        }

        .homeBusinessLinksHeader {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 17px;
        }

        .homeBusinessLinksHeader span {
          display: block;
          margin-bottom: 5px;
          color: #6d28d9;
          font-size: 10px;
          font-weight: 950;
        }

        .homeBusinessLinksHeader h2 {
          margin: 0;
          color: #21152f;
          font-size: clamp(21px, 2vw, 30px);
          line-height: 1.55;
        }

        .homeBusinessLinksHeader > a {
          min-height: 40px;
          padding: 0 15px;
          border: 1px solid #ddcff0;
          border-radius: 13px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
          color: #4c1d95;
          background: #ffffff;
          font-size: 10px;
          font-weight: 900;
          box-shadow: 0 8px 20px rgba(66, 38, 103, 0.05);
        }

        .homeBusinessLinksGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 13px;
        }

        .homeBusinessLinkCard {
          min-width: 0;
          min-height: 136px;
          padding: 18px;
          border: 1px solid #e6dbf0;
          border-radius: 21px;
          display: grid;
          grid-template-columns: 54px minmax(0, 1fr) 22px;
          align-items: center;
          gap: 14px;
          color: #251735;
          background: rgba(255, 255, 255, 0.94);
          box-shadow: 0 14px 34px rgba(50, 31, 74, 0.055);
          transition: transform 170ms ease, border-color 170ms ease, box-shadow 170ms ease;
        }

        .homeBusinessLinkCard:hover {
          transform: translateY(-3px);
          border-color: #d3bee9;
          box-shadow: 0 19px 40px rgba(50, 31, 74, 0.09);
        }

        .homeBusinessLinkCard--parts {
          background:
            radial-gradient(circle at 100% 0%, rgba(37, 99, 235, 0.08), transparent 17rem),
            #ffffff;
        }

        .homeBusinessLinkIcon {
          width: 54px;
          height: 54px;
          border-radius: 18px;
          display: grid;
          place-items: center;
          color: #ffffff;
          background: linear-gradient(145deg, #7c3aed, #6d28d9);
          box-shadow: 0 11px 24px rgba(109, 40, 217, 0.2);
        }

        .homeBusinessLinkCard--parts .homeBusinessLinkIcon {
          background: linear-gradient(145deg, #2563eb, #1d4ed8);
          box-shadow: 0 11px 24px rgba(37, 99, 235, 0.19);
        }

        .homeBusinessLinkCopy {
          min-width: 0;
        }

        .homeBusinessLinkCopy > strong,
        .homeBusinessLinkCopy > small {
          display: block;
        }

        .homeBusinessLinkCopy > strong {
          margin-bottom: 7px;
          font-size: 15px;
          font-weight: 950;
        }

        .homeBusinessLinkCopy > small {
          color: #7f7489;
          font-size: 10px;
          line-height: 1.9;
        }

        .homeBusinessLinkMeta {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 11px;
        }

        .homeBusinessLinkMeta em {
          min-height: 26px;
          padding: 0 9px;
          border: 1px solid #ece3f4;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          color: #6a527c;
          background: #f7f3fb;
          font-size: 8px;
          font-style: normal;
          font-weight: 800;
        }

        .homeBusinessLinkCard > b {
          color: #8b5fc5;
          font-size: 21px;
          font-weight: 500;
        }

        .homeBusinessLinkCard--parts > b {
          color: #3b82f6;
        }

        @media (max-width: 760px) {
          .homeBusinessLinks {
            width: calc(100% - 20px);
            margin-bottom: 18px;
            padding: 18px 14px;
            border-radius: 22px;
          }

          .homeBusinessLinksHeader {
            align-items: flex-start;
            flex-direction: column;
            gap: 10px;
            margin-bottom: 13px;
          }

          .homeBusinessLinksHeader h2 {
            font-size: 19px;
          }

          .homeBusinessLinksHeader > a {
            min-height: 34px;
            padding: 0 11px;
            font-size: 8px;
          }

          .homeBusinessLinksGrid {
            grid-template-columns: 1fr;
            gap: 9px;
          }

          .homeBusinessLinkCard {
            min-height: 112px;
            padding: 13px;
            grid-template-columns: 46px minmax(0, 1fr) 18px;
            gap: 10px;
            border-radius: 17px;
          }

          .homeBusinessLinkIcon {
            width: 46px;
            height: 46px;
            border-radius: 15px;
          }

          .homeBusinessLinkCopy > strong {
            font-size: 13px;
          }

          .homeBusinessLinkCopy > small {
            font-size: 8px;
          }

          .homeBusinessLinkMeta {
            overflow-x: auto;
            flex-wrap: nowrap;
            padding-bottom: 2px;
            scrollbar-width: none;
          }

          .homeBusinessLinkMeta::-webkit-scrollbar {
            display: none;
          }

          .homeBusinessLinkMeta em {
            flex: 0 0 auto;
          }
        }
      `}</style>
    </section>
  );
}
