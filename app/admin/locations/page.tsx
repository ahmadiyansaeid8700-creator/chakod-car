"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type GeoResponse = {
  success?: boolean;
  type?: string;
  has_neighborhoods?: boolean;
  data?: string[];
  message?: string;
};

async function readGeo(params?: { province?: string; city?: string }) {
  const search = new URLSearchParams();
  if (params?.province) search.set("province", params.province);
  if (params?.city) search.set("city", params.city);
  const response = await fetch(`/api/geo-locations${search.size ? `?${search}` : ""}`, {
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  const payload = (await response.json().catch(() => null)) as GeoResponse | null;
  if (!response.ok || !payload?.success || !Array.isArray(payload.data)) {
    throw new Error(payload?.message || "اطلاعات موقعیت دریافت نشد.");
  }
  return payload;
}

export default function AdminLocationsPage() {
  const [provinces, setProvinces] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadProvinces() {
    setLoading(true);
    setError("");
    try {
      const payload = await readGeo();
      setProvinces(payload.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "دریافت استان‌ها انجام نشد.");
    } finally {
      setLoading(false);
    }
  }

  async function selectProvince(value: string) {
    setProvince(value);
    setCity("");
    setCities([]);
    setNeighborhoods([]);
    if (!value) return;
    setLoading(true);
    setError("");
    try {
      const payload = await readGeo({ province: value });
      setCities(payload.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "دریافت شهرها انجام نشد.");
    } finally {
      setLoading(false);
    }
  }

  async function selectCity(value: string) {
    setCity(value);
    setNeighborhoods([]);
    if (!province || !value) return;
    setLoading(true);
    setError("");
    try {
      const payload = await readGeo({ province, city: value });
      setNeighborhoods(payload.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "دریافت محله‌ها انجام نشد.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProvinces();
  }, []);

  return (
    <main dir="rtl" style={{ minHeight: "100vh", padding: "28px 18px 90px", background: "#f8f6fb", color: "#24162f" }}>
      <div style={{ width: "min(1040px, 100%)", margin: "0 auto" }}>
        <Link href="/admin" style={{ color: "#6d28d9", fontWeight: 900, textDecoration: "none" }}>← مدیریت</Link>
        <header style={{ margin: "18px 0", padding: 26, border: "1px solid #e7dff0", borderRadius: 22, background: "#fff" }}>
          <span style={{ color: "#6d28d9", fontWeight: 900, fontSize: 12 }}>LOCATION DIRECTORY</span>
          <h1 style={{ margin: "8px 0" }}>موقعیت‌های فعال چاکود</h1>
          <p style={{ margin: 0, color: "#76677f", lineHeight: 1.9 }}>این صفحه مستقیماً از سرویس موقعیت چاکود می‌خواند تا استان، شهر و محله‌های قابل استفاده در بازار و کسب‌وکارها قابل بازبینی باشند.</p>
        </header>

        <section style={{ padding: 20, borderRadius: 20, background: "#fff", border: "1px solid #e7dff0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12 }}>
            <label style={{ display: "grid", gap: 7 }}>
              <span style={{ fontWeight: 900 }}>استان</span>
              <select value={province} onChange={(e) => void selectProvince(e.target.value)} style={{ minHeight: 44, borderRadius: 12, border: "1px solid #d8cce3", padding: "0 10px", background: "#fff" }}>
                <option value="">انتخاب استان</option>
                {provinces.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label style={{ display: "grid", gap: 7 }}>
              <span style={{ fontWeight: 900 }}>شهر</span>
              <select disabled={!province} value={city} onChange={(e) => void selectCity(e.target.value)} style={{ minHeight: 44, borderRadius: 12, border: "1px solid #d8cce3", padding: "0 10px", background: "#fff" }}>
                <option value="">انتخاب شهر</option>
                {cities.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" disabled={loading} onClick={() => void loadProvinces()} style={{ minHeight: 40, padding: "0 14px", border: 0, borderRadius: 12, background: "#6d28d9", color: "#fff", fontWeight: 900, cursor: "pointer" }}>{loading ? "در حال دریافت…" : "به‌روزرسانی فهرست"}</button>
            <span style={{ color: "#76677f" }}>{provinces.length.toLocaleString("fa-IR")} استان دریافت شده</span>
          </div>

          {error ? <p style={{ marginTop: 16, padding: 12, borderRadius: 12, background: "#fff1f2", color: "#9f1239" }}>{error}</p> : null}

          {province && city ? (
            <div style={{ marginTop: 22 }}>
              <h2 style={{ fontSize: 17 }}>محله‌های {city}</h2>
              {neighborhoods.length ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {neighborhoods.map((item) => <span key={item} style={{ padding: "8px 11px", borderRadius: 999, background: "#f4effb", color: "#5b21b6", fontWeight: 800 }}>{item}</span>)}
                </div>
              ) : <p style={{ color: "#76677f" }}>برای این شهر محله‌ای از سرویس موقعیت برنگشته است.</p>}
            </div>
          ) : null}
        </section>

        <p style={{ marginTop: 14, color: "#76677f", lineHeight: 1.8 }}>ویرایش ساختار استان/شهر در Backend اصلی انجام می‌شود؛ این صفحه از ایجاد منبع داده موازی جلوگیری می‌کند و مرجع زنده را نمایش می‌دهد.</p>
      </div>
    </main>
  );
}
