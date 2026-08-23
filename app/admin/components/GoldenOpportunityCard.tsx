import Link from "next/link";

export default function GoldenOpportunityCard() {
  return (
    <Link
      href="/admin/settings/golden-opportunity"
      className="module active"
    >
      <span className="moduleIcon">⭐</span>
      <b>فرصت طلایی</b>
      <p>مدیریت قیمت، ظرفیت، قوانین AI و بازگشت وجه.</p>
      <em>ورود به تنظیمات</em>
    </Link>
  );
}
