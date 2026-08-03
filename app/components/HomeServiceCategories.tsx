type ServiceIconName =
  | "repair"
  | "parts"
  | "electrical"
  | "bodywork"
  | "oil"
  | "carwash"
  | "tire"
  | "roadside";

type ServiceItem = {
  icon: ServiceIconName;
  title: string;
  subtitle: string;
  href: string;
};

const serviceItems: ServiceItem[] = [
  {
    icon: "repair",
    title: "تعمیرگاه‌ها",
    subtitle: "مکانیک و سرویس تخصصی",
    href: "#repair-membership",
  },
  {
    icon: "parts",
    title: "لوازم یدکی",
    subtitle: "فروشگاه قطعات خودرو",
    href: "#parts-membership",
  },
  {
    icon: "electrical",
    title: "برق خودرو",
    subtitle: "برق‌کار و دیاگ",
    href: "#service-membership",
  },
  {
    icon: "bodywork",
    title: "صافکاری و رنگ",
    subtitle: "بدنه و نقاشی",
    href: "#service-membership",
  },
  {
    icon: "oil",
    title: "تعویض روغن",
    subtitle: "سرویس‌های دوره‌ای",
    href: "#service-membership",
  },
  {
    icon: "carwash",
    title: "کارواش",
    subtitle: "شست‌وشو و دیتیلینگ",
    href: "#service-membership",
  },
  {
    icon: "tire",
    title: "لاستیک و رینگ",
    subtitle: "فروش و خدمات",
    href: "#service-membership",
  },
  {
    icon: "roadside",
    title: "امداد خودرو",
    subtitle: "خدمات شبانه‌روزی",
    href: "#service-membership",
  },
];

function ServiceIcon({ name }: { name: ServiceIconName }) {
  const common = {
    viewBox: "0 0 24 24",
    width: 26,
    height: 26,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "repair":
      return (
        <svg {...common}>
          <path d="M14.7 5.2a4.2 4.2 0 0 0-5.2 5.2L4 15.9 8.1 20l5.5-5.5a4.2 4.2 0 0 0 5.2-5.2l-2.7 2.7-3.1-3.1 2.7-2.7Z" />
        </svg>
      );
    case "parts":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3.1" />
          <path d="M12 3.5v2M12 18.5v2M20.5 12h-2M5.5 12h-2M18 6l-1.4 1.4M7.4 16.6 6 18M18 18l-1.4-1.4M7.4 7.4 6 6" />
        </svg>
      );
    case "electrical":
      return (
        <svg {...common}>
          <path d="m13.6 2.8-7 10h5l-1.2 8.4 7-10h-5l1.2-8.4Z" />
        </svg>
      );
    case "bodywork":
      return (
        <svg {...common}>
          <path d="M5 16h14l-1.1-4.7a2.2 2.2 0 0 0-2.1-1.7H8.2a2.2 2.2 0 0 0-2.1 1.7L5 16Z" />
          <path d="M8 18h.1M16 18h.1M15.5 5.2l2-2M18.6 7.8l2.4-.2" />
        </svg>
      );
    case "oil":
      return (
        <svg {...common}>
          <path d="M8 5.2h8v14H8z" />
          <path d="M10 5.2V3.5h4v1.7M9.8 10.5h4.4M17.8 8.2c1.3 1.5 2 2.5 2 3.4a2 2 0 0 1-4 0c0-.9.7-1.9 2-3.4Z" />
        </svg>
      );
    case "carwash":
      return (
        <svg {...common}>
          <path d="M5 16h14l-1.1-4.7a2.2 2.2 0 0 0-2.1-1.7H8.2a2.2 2.2 0 0 0-2.1 1.7L5 16Z" />
          <path d="M8 18h.1M16 18h.1M7 4.5l-.7 1.2M12 3.5v1.4M17 4.5l.7 1.2" />
        </svg>
      );
    case "tire":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="7.5" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 4.5v4.4M12 15.1v4.4M4.5 12h4.4M15.1 12h4.4" />
        </svg>
      );
    case "roadside":
      return (
        <svg {...common}>
          <path d="M5 15.5h14l-1.2-5.1a2 2 0 0 0-1.9-1.5H8.1a2 2 0 0 0-1.9 1.5L5 15.5Z" />
          <path d="M7.5 18h.1M16.5 18h.1M12 3v3M10.2 4.5h3.6" />
        </svg>
      );
  }
}

export default function HomeServiceCategories() {
  return (
    <section
      className="serviceSection"
      id="auto-services"
      aria-labelledby="service-title"
    >
      <div className="serviceHeading">
        <div>
          <span>خدمات خودرویی چاکود</span>
          <h2 id="service-title">هر چیزی که خودرو نیاز دارد، یکجا</h2>
          <p>
            تعمیرکار، فروشگاه قطعات و خدمات تخصصی نزدیک خودت را پیدا کن یا
            کسب‌وکارت را به بازار چاکود اضافه کن.
          </p>
        </div>
        <a href="#service-membership">عضویت کسب‌وکارها ←</a>
      </div>

      <div className="serviceGrid" aria-label="دسته‌بندی خدمات خودرو">
        {serviceItems.map((item) => (
          <a className={`serviceItem serviceItem--${item.icon}`} href={item.href} key={item.title}>
            <span className="serviceIcon">
              <ServiceIcon name={item.icon} />
            </span>
            <strong>{item.title}</strong>
            <small>{item.subtitle}</small>
          </a>
        ))}
      </div>

      <div className="servicePromoGrid" id="service-membership">
        <article
          className="servicePromo servicePromo--repair"
          id="repair-membership"
        >
          <span className="servicePromoBadge">ویژه تعمیرکاران</span>
          <div>
            <h3>تعمیرگاهت را به مشتری‌های نزدیک معرفی کن</h3>
            <p>
              صفحه اختصاصی، شماره تماس، آدرس، خدمات و تصاویر محیط کسب‌وکار.
            </p>
          </div>
          <a href="#publish">ثبت درخواست عضویت ←</a>
        </article>

        <article
          className="servicePromo servicePromo--parts"
          id="parts-membership"
        >
          <span className="servicePromoBadge">ویژه فروشگاه‌ها</span>
          <div>
            <h3>فروشگاه لوازم یدکی را وارد بازار چاکود کن</h3>
            <p>
              معرفی برندها، قطعات موجود، شهر فعالیت و راه ارتباط با مشتری.
            </p>
          </div>
          <a href="#publish">ثبت درخواست عضویت ←</a>
        </article>
      </div>
    </section>
  );
}
