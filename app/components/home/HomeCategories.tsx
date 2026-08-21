const categories = [
  { title: "خودروهای لوکس", href: "/ads/luxury" },
  { title: "منطقه آزاد", href: "/ads/freezone" },
  { title: "صفر کیلومتر", href: "/ads/all?category=zero" },
  { title: "کارکرده", href: "/ads/all?category=used" },
  { title: "کلاسیک", href: "/ads/all?category=classic" },
];

export default function HomeCategories() {
  return (
    <section className="chakodHomeCategories" dir="rtl">
      <div className="chakodSectionTitle">
        <span>دسته‌بندی خودرو</span>
        <h2>انتخاب سریع بازار</h2>
      </div>
      <div className="chakodCategoryGrid">
        {categories.map((item) => (
          <a key={item.href} href={item.href}>
            {item.title}
          </a>
        ))}
      </div>
    </section>
  );
}
