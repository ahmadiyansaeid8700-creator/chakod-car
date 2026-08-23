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
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [provinceSlots, setProvinceSlots] = useState(5);
  const [discountPrice, setDiscountPrice] = useState("");
  const [priceChecked, setPriceChecked] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const token = localStorage.getItem("chakod_session_token") || "";
        const result = await getGoldenOpportunityListings(token);
        const json = await result.json();

        if (json.success) {
          setListings(json.listings || []);
          setProvinceSlots(Number(json.available_slots || 5));
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
      <p>آگهی خودرو را انتخاب کنید تا برای چرخه بعدی بررسی شود.</p>

      <section>
        <h2>ظرفیت چرخه بعدی</h2>
        <p>{provinceSlots} جای خالی برای استان شما باقی مانده است.</p>
      </section>

      <section>
        <h2>آگهی‌های قابل شرکت</h2>
        {loading && <p>در حال دریافت آگهی‌ها...</p>}

        {listings.map((item) => (
          <article key={item.id} style={{ marginBottom: 16 }}>
            <strong>{item.title || "خودرو"}</strong>
            <div>{item.city || ""}</div>
            <div>{item.price ? `${item.price} تومان` : ""}</div>
            <button onClick={() => setSelectedId(item.id)}>
              {selectedId === item.id ? "انتخاب شد" : "انتخاب برای فرصت طلایی"}
            </button>
          </article>
        ))}
      </section>

      {selectedId && (
        <section>
          <h2>ثبت قیمت فرصت طلایی</h2>
          <p>قیمت فعلی آگهی بررسی می‌شود. لطفاً قیمت پیشنهادی خود را وارد کنید.</p>
          <input
            value={discountPrice}
            onChange={(e) => setDiscountPrice(e.target.value)}
            placeholder="قیمت پیشنهادی"
          />
          <button onClick={() => setPriceChecked(true)}>
            بررسی شرایط ۴۸ ساعت گذشته
          </button>

          {priceChecked && (
            <p>
              شرایط اولیه ثبت شد. مرحله بعد پرداخت هزینه بررسی و ارسال به AI است.
            </p>
          )}
        </section>
      )}
    </main>
  );
}
