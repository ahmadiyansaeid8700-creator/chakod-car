"use client";

import { useEffect, useState } from "react";
import { getGoldenOpportunityListings } from "./api";

type Listing = {
  id: number;
  title?: string;
  price?: number;
  city?: string;
  image?: string;
};

export default function GoldenOpportunityPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const token = localStorage.getItem("chakod_session_token") || "";
        const result = await getGoldenOpportunityListings(token);
        const json = await result.json();
        if (json.success) {
          setListings(json.listings || []);
        }
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <main dir="rtl" style={{ padding: 24 }}>
      <h1>فرصت طلایی</h1>
      <p>آگهی موردنظر خود را برای شرکت در چرخه فرصت طلایی انتخاب کنید.</p>

      <section>
        <h2>آگهی‌های قابل شرکت</h2>
        {loading && <p>در حال دریافت آگهی‌ها...</p>}

        {!loading && listings.length === 0 && (
          <p>آگهی قابل شرکت پیدا نشد.</p>
        )}

        {listings.map((item) => (
          <article key={item.id}>
            <strong>{item.title || "خودرو"}</strong>
            <div>{item.city || ""}</div>
            <div>{item.price ? `${item.price} تومان` : ""}</div>
            <button>انتخاب برای فرصت طلایی</button>
          </article>
        ))}
      </section>

      <section>
        <h2>چرخه بعدی</h2>
        <p>ظرفیت استان و زمان شروع چرخه از تنظیمات مرکزی دریافت خواهد شد.</p>
      </section>
    </main>
  );
}
