import Link from "next/link";

import Footer from "../components/layout/Footer";
import Header from "../components/layout/Header";
import styles from "./page.module.css";

const products = [
  {
    title: "استوری آگهی خودرو",
    text: "یک آگهی فعال را برای دیده شدن بیشتر در استوری محدوده مرتبط انتخاب کنید.",
    href: "/advertising/stories",
    action: "مشاهده فرایند استوری",
  },
  {
    title: "جایگاه کسب و کار",
    text: "کسب و کار خودرویی را در دسته و محدوده مرتبط بالاتر نمایش دهید.",
    href: "/advertising/business-placement",
    action: "مشاهده جایگاه کسب و کار",
  },
  {
    title: "نمایشگاه منتخب",
    text: "نمایشگاه، استان و بازه زمانی را رزرو کنید تا پس از پرداخت و تایید وارد Rail نمایشگاه های منتخب شود.",
    href: "/advertising/dealership-placement",
    action: "مشاهده فرایند نمایشگاه منتخب",
  },
];

export default function AdvertisingPage() {
  return (
    <>
      <Header />
      <main className={styles.page} dir="rtl">
        <div className={styles.shell}>
          <section className={styles.hero}>
            <span>CHAKOD ADVERTISING</span>
            <h1>دیده شدن بیشتر در چاکود</h1>
            <p>محصول تبلیغاتی را براساس نوع هدف انتخاب کنید. سفارش ها از تعرفه فعال، Checkout واحد، کیف پول یا درگاه و ثبت مالی چاکود عبور می کنند.</p>
            <div><Link href="/account/promotions">ورود به محصولات فعال حساب</Link></div>
          </section>

          <section className={styles.products}>
            {products.map((product, index) => (
              <Link href={product.href} key={product.href}>
                <span>{new Intl.NumberFormat("fa-IR").format(index + 1)}</span>
                <h2>{product.title}</h2>
                <p>{product.text}</p>
                <strong>{product.action} ←</strong>
              </Link>
            ))}
          </section>

          <section className={styles.ruleCard}>
            <div>
              <span>قاعده چاکود</span>
              <h2>تبلیغ پولی باید مسیر سفارش مشخص داشته باشد</h2>
              <p>تعرفه از Commerce خوانده می شود، مبلغ در سفارش قفل می شود و فعال سازی فقط پس از پرداخت معتبر و شرایط محصول انجام می شود.</p>
            </div>
            <Link href="/account/payments">مرکز مالی</Link>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
