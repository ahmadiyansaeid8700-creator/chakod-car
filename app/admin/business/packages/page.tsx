"use client";

import { useEffect, useState } from "react";
import { AdminPage, AdminPanel, StatusPill } from "../../components/AdminPage";
import styles from "../../components/AdminForms.module.css";

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
        if (response.ok) setPackages(await response.json());
      } finally {
        setLoading(false);
      }
    }
    void loadPackages();
  }, []);

  return (
    <AdminPage
      eyebrow="تجارت و درآمد"
      title="پکیج‌ها و خدمات"
      description="پکیج‌های شخصی، نمایشگاهی و خدمات ویژه چاکود را در یک فهرست واحد بررسی کنید."
      actions={<StatusPill>{loading ? "در حال دریافت" : `${packages.length.toLocaleString("fa-IR")} پکیج`}</StatusPill>}
    >
      <AdminPanel title="فهرست پکیج‌ها" description="قیمت و تخفیف نهایی از قوانین تجاری مرکزی خوانده می‌شود.">
        {loading ? (
          <p className={styles.meta}>در حال دریافت پکیج‌ها...</p>
        ) : packages.length === 0 ? (
          <p className={styles.meta}>هنوز پکیجی ثبت نشده است.</p>
        ) : (
          <ul className={styles.list}>
            {packages.map((item) => (
              <li className={styles.listItem} key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.adsCount.toLocaleString("fa-IR")} آگهی · تخفیف {item.discountPercent.toLocaleString("fa-IR")}٪</span>
                </div>
                <div>
                  <strong>{item.price.toLocaleString("fa-IR")} تومان</strong>
                  <span>{item.active ? "فعال" : "غیرفعال"}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AdminPanel>
    </AdminPage>
  );
}
