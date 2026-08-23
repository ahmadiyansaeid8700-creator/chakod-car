"use client";

import { useEffect, useState } from "react";

const API_BASE = "https://api.chakod.com";

type PackageItem = {
  id: string;
  name: string;
  adsCount: number;
  price: number;
  discountPercent: number;
  active: boolean;
};

export default function PackagesManagementPage() {
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPackages() {
      try {
        const response = await fetch(`${API_BASE}/api/admin/packages.php`, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        if (response.ok) {
          setPackages(await response.json());
        }
      } finally {
        setLoading(false);
      }
    }

    void loadPackages();
  }, []);

  return (
    <main dir="rtl" style={{ padding: 24 }}>
      <h1>مدیریت پکیج‌ها و خدمات</h1>
      <p>
        مدیریت پکیج‌های شخصی، نمایشگاهی و خدمات ویژه از یک مرکز انجام می‌شود.
      </p>

      {loading ? (
        <p>در حال دریافت پکیج‌ها...</p>
      ) : (
        <section>
          <h2>لیست پکیج‌ها</h2>
          {packages.length === 0 ? (
            <p>پکیجی ثبت نشده است.</p>
          ) : (
            <ul>
              {packages.map((item) => (
                <li key={item.id}>
                  {item.name} - {item.adsCount} آگهی - {item.price} تومان - تخفیف {item.discountPercent}% - {item.active ? "فعال" : "غیرفعال"}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
