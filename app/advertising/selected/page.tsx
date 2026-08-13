import Link from "next/link";

import Footer from "../../components/layout/Footer";
import Header from "../../components/layout/Header";
import styles from "../page.module.css";

const selectedTypes = [
  {
    title: "نمایشگاه منتخب",
    text: "ویترین تبلیغاتی نمایشگاه از لوگو، اطلاعات واقعی مجموعه و خودروهای فعال ساخته می‌شود.",
    href: "/advertising/dealership-placement",
    action: "رزرو نمایشگاه منتخب",
  },
  {
    title: "تعمیرگاه منتخب",
    text: "چاکود ویترین کوتاه تعمیرگاه را از پروفایل تاییدشده، تخصص‌ها و محدوده خدمت می‌سازد.",
    href: "/advertising/business-placement?type=repair_shop",
    action: "رزرو تعمیرگاه منتخب",
  },
  {
    title: "یدکی منتخب",
    text: "فروشگاه قطعات با نام، دسته‌های اصلی، محدوده و هویت تاییدشده وارد ویترین منتخب می‌شود.",
    href: "/advertising/business-placement?type=parts_store",
    action: "رزرو یدکی منتخب",
  },
  {
    title: "خدمات منتخب",
    text: "مراکز خدمات خودرو با خدمات اصلی و پروفایل واقعی در ویترین کوتاه و هدفمند نمایش داده می‌شوند.",
    href: "/advertising/business-placement?type=car_service",
    action: "رزرو خدمات منتخب",
  },
] as const;

export default function AdvertisingSelectedPage() {
  return (
    <>
      <Header />
      <main className={styles.page} dir="rtl">
        <div className={styles.shell}>
          <section className={styles.hero}>
            <span>CHAKOD SELECTED</span>
            <h1>رزرو منتخب چاکود</h1>
            <p>
              «منتخب» در چاکود یک جایگاه تبلیغاتی کنترل‌شده است، نه پست اجتماعی.
              کسب‌وکار تاییدشده جایگاه را رزرو می‌کند و چاکود ویترین کوتاه را از اطلاعات واقعی همان مجموعه می‌سازد تا ظاهر، کیفیت و اعتماد برای همه یکدست بماند.
            </p>
            <div>
              <Link href="/account/promotions">ورود به محصولات فعال حساب</Link>
            </div>
          </section>

          <section className={styles.products} aria-label="انواع جایگاه منتخب">
            {selectedTypes.map((item, index) => (
              <Link href={item.href} key={item.title}>
                <span>{new Intl.NumberFormat("fa-IR").format(index + 1)}</span>
                <h2>{item.title}</h2>
                <p>{item.text}</p>
                <strong>{item.action} ←</strong>
              </Link>
            ))}
          </section>

          <section className={styles.ruleCard}>
            <div>
              <span>قاعده محتوایی</span>
              <h2>کسب‌وکار برای «منتخب» استوری آزاد آپلود نمی‌کند</h2>
              <p>
                تصویر و متن اصلی از پروفایل تاییدشده، خدمات ثبت‌شده و اطلاعات واقعی مجموعه گرفته می‌شود.
                پس از رزرو و تایید، همان داده‌ها به قالب «منتخب چاکود» تبدیل می‌شوند و می‌توانند در ویترین کوتاه صفحه اصلی و جایگاه مرتبط نمایش داده شوند.
              </p>
            </div>
            <Link href="/advertising/stories">سناریوی استوری تبلیغاتی</Link>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
