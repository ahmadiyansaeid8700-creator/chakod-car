"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import MobileBottomNav from "../../../components/MobileBottomNav";
import styles from "./page.module.css";

const API_BASE = "https://api.chakod.com";
const MAX_IMAGES = 10;
const MAX_SOURCE_SIZE = 20 * 1024 * 1024;
const MAX_UPLOAD_SIZE = 6 * 1024 * 1024;

type User = {
  id?: number;
  full_name?: string | null;
  display_name?: string | null;
  mobile?: string | null;
};

type Dealer = {
  id: number;
  dealer_name?: string;
  is_active?: boolean | number;
};

type VehicleBrand = {
  code: string;
  name_fa: string;
  name_en?: string | null;
};

type VehicleModel = {
  code: string;
  brand_code: string;
  name_fa: string;
  name_en?: string | null;
  body_hint?: string | null;
};

type SaleStatus = {
  code: string;
  icon: string;
  title: string;
  subtitle: string;
};

type ImageItem = {
  localId: string;
  file: File;
  previewUrl: string;
  status: "selected" | "uploading" | "uploaded" | "error";
  progress: number;
  imageId?: number;
  imageUrl?: string;
  error?: string;
};

type UploadResponse = {
  success?: boolean;
  message?: string;
  image_id?: number | string;
  image_url?: string;
};

const saleStatuses: SaleStatus[] = [
  { code: "zero", icon: "🚘", title: "صفر و آماده تحویل", subtitle: "صفر کیلومتر یا آماده تحویل فوری" },
  { code: "used", icon: "🚗", title: "کارکرده و کم‌کارکرد", subtitle: "خودروی کارکرده، تمیز یا مصرفی" },
  { code: "preorder", icon: "🧾", title: "حواله و پیش‌فروش", subtitle: "ثبت‌نامی، حواله‌ای یا در انتظار تحویل" },
  { code: "freezone", icon: "🏝️", title: "منطقه آزاد", subtitle: "پلاک منطقه آزاد و شرایط همان محدوده" },
  { code: "classic", icon: "🏁", title: "کلاسیک و کلکسیونی", subtitle: "قدیمی، کمیاب، خاص یا کلکسیونی" },
];

const colors = [
  "سفید", "مشکی", "نقره‌ای", "نوک‌مدادی", "خاکستری", "آبی", "سرمه‌ای", "قرمز", "زرشکی",
  "قهوه‌ای", "بژ", "طلایی", "سبز", "زرد", "نارنجی", "کرم", "سفید صدفی", "مشکی متالیک", "سایر",
];

const persianYears = Array.from({ length: 86 }, (_, index) => String(1405 - index));
const gregorianYears = Array.from({ length: 77 }, (_, index) => String(2026 - index));

const formSteps = [
  { id: 1, title: "صاحب آگهی", short: "مالک" },
  { id: 2, title: "نوع فروش", short: "نوع" },
  { id: 3, title: "خودرو", short: "خودرو" },
  { id: 4, title: "اطلاعات اصلی", short: "اطلاعات" },
  { id: 5, title: "وضعیت خودرو", short: "وضعیت" },
  { id: 6, title: "موقعیت", short: "موقعیت" },
  { id: 7, title: "تصاویر", short: "تصاویر" },
  { id: 8, title: "پیش‌نمایش آگهی", short: "پیش‌نمایش" },
];

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("chakod_session_token") || "";
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}`, "X-Session-Token": token } : {};
}

async function readJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  try {
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}

function toEnglishDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function cleanNumber(value: string) {
  return toEnglishDigits(value).replace(/[^\d]/g, "");
}

function formatInputNumber(value: string) {
  const clean = cleanNumber(value);
  return clean ? clean.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "";
}

function formatPrice(value: string) {
  const number = Number(cleanNumber(value) || 0);
  if (!number) return "قیمت توافقی";
  if (number >= 1_000_000_000) {
    return `${(number / 1_000_000_000).toLocaleString("fa-IR", { maximumFractionDigits: 1 })} میلیارد تومان`;
  }
  if (number >= 1_000_000) {
    return `${(number / 1_000_000).toLocaleString("fa-IR", { maximumFractionDigits: 0 })} میلیون تومان`;
  }
  return `${number.toLocaleString("fa-IR")} تومان`;
}

function makeLocalId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function canvasToWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("فشرده‌سازی تصویر انجام نشد.")), "image/webp", quality);
  });
}

async function optimizeImage(file: File) {
  if (file.size > MAX_SOURCE_SIZE) throw new Error("حجم فایل اصلی بیشتر از ۲۰ مگابایت است.");
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const next = new Image();
      next.onload = () => resolve(next);
      next.onerror = () => reject(new Error("تصویر انتخاب‌شده قابل پردازش نیست."));
      next.src = url;
    });
    const maxEdge = 1600;
    const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth || 1, image.naturalHeight || 1));
    const width = Math.max(1, Math.round((image.naturalWidth || 1) * scale));
    const height = Math.max(1, Math.round((image.naturalHeight || 1) * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("مرورگر امکان پردازش تصویر را ندارد.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const blob = await canvasToWebp(canvas, .78);
    if (blob.size > MAX_UPLOAD_SIZE) throw new Error("حجم تصویر بعد از فشرده‌سازی هنوز بیشتر از ۶ مگابایت است.");
    const base = file.name.replace(/\.[^.]+$/, "").replace(/[^\w\u0600-\u06FF-]+/g, "-") || `chakod-${Date.now()}`;
    return new File([blob], `${base}.webp`, { type: "image/webp", lastModified: Date.now() });
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function fetchGeo(params?: { province?: string; city?: string }) {
  const search = new URLSearchParams();
  if (params?.province) search.set("province", params.province);
  if (params?.city) search.set("city", params.city);
  const response = await fetch(`${API_BASE}/api/geo-locations.php${search.size ? `?${search}` : ""}`);
  const payload = await readJson<{ success?: boolean; data?: string[]; has_neighborhoods?: boolean }>(response);
  return {
    data: Array.isArray(payload?.data) ? payload!.data! : [],
    hasNeighborhoods: Boolean(payload?.has_neighborhoods),
  };
}

async function fetchBrands() {
  const response = await fetch(`${API_BASE}/api/vehicle-catalog.php`);
  const payload = await readJson<{ success?: boolean; data?: VehicleBrand[] }>(response);
  const items = Array.isArray(payload?.data) ? payload!.data! : [];
  return items.sort((a, b) => (a.name_fa || a.code).localeCompare(b.name_fa || b.code, "fa"));
}

async function fetchModels(brandCode: string) {
  const response = await fetch(`${API_BASE}/api/vehicle-catalog.php?brand_code=${encodeURIComponent(brandCode)}`);
  const payload = await readJson<{ success?: boolean; data?: VehicleModel[] }>(response);
  const items = Array.isArray(payload?.data) ? payload!.data! : [];
  return items.sort((a, b) => {
    if (a.code === "other") return 1;
    if (b.code === "other") return -1;
    return (a.name_fa || a.code).localeCompare(b.name_fa || b.code, "fa");
  });
}

function uploadImage(listingId: number, item: ImageItem, onProgress: (progress: number) => void) {
  return new Promise<UploadResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/api/upload-listing-image.php`);
    xhr.timeout = 120_000;
    const token = getToken();
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.setRequestHeader("X-Session-Token", token);
    }
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      try {
        resolve(JSON.parse(xhr.responseText) as UploadResponse);
      } catch {
        reject(new Error("پاسخ سرور برای آپلود تصویر معتبر نبود."));
      }
    };
    xhr.onerror = () => reject(new Error("ارتباط با سرور هنگام آپلود تصویر قطع شد."));
    xhr.ontimeout = () => reject(new Error("زمان آپلود تصویر بیش از حد طولانی شد."));
    const body = new FormData();
    body.append("listing_id", String(listingId));
    body.append("image", item.file);
    xhr.send(body);
  });
}

export default function SubmitListingPage() {
  const searchParams = useSearchParams();
  const requestedDealerId = Math.max(0, Math.round(Number(searchParams.get("dealer_id") || 0)));
  const imageUrlsRef = useRef<string[]>([]);

  const [booting, setBooting] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [brands, setBrands] = useState<VehicleBrand[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [provinces, setProvinces] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [cityHasNeighborhoods, setCityHasNeighborhoods] = useState(false);

  const [activeStep, setActiveStep] = useState(1);
  const [maxVisited, setMaxVisited] = useState(1);
  const [listingOwnerType, setListingOwnerType] = useState<"personal" | "dealer">("personal");
  const [selectedDealerId, setSelectedDealerId] = useState("");
  const [categoryCode, setCategoryCode] = useState("used");
  const [vehicleBrandCode, setVehicleBrandCode] = useState("");
  const [vehicleModelCode, setVehicleModelCode] = useState("");
  const [vehicleCustomModelName, setVehicleCustomModelName] = useState("");
  const [title, setTitle] = useState("");
  const [productionYear, setProductionYear] = useState("");
  const [mileageKm, setMileageKm] = useState("");
  const [priceToman, setPriceToman] = useState("");
  const [color, setColor] = useState("");
  const [bodyStatus, setBodyStatus] = useState("سالم");
  const [transmission, setTransmission] = useState("اتوماتیک");
  const [fuelType, setFuelType] = useState("بنزین");
  const [description, setDescription] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [images, setImages] = useState<ImageItem[]>([]);
  const [coverLocalId, setCoverLocalId] = useState<string | null>(null);

  const [processingImages, setProcessingImages] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdListingId, setCreatedListingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void (async () => {
      setBooting(true);
      try {
        const [meResponse, brandItems, geo] = await Promise.all([
          fetch(`${API_BASE}/api/me.php`, { cache: "no-store", headers: authHeaders() }),
          fetchBrands(),
          fetchGeo(),
        ]);
        const me = await readJson<{ success?: boolean; logged_in?: boolean; user?: User }>(meResponse);
        if (!me?.success || !me.logged_in || !me.user) {
          setLoggedIn(false);
        } else {
          setLoggedIn(true);
          setUser(me.user);
          const dealerResponse = await fetch(`${API_BASE}/api/my-dealers.php`, { cache: "no-store", headers: authHeaders() });
          const dealerPayload = await readJson<{ success?: boolean; data?: Array<Record<string, unknown>> }>(dealerResponse);
          const normalized = (Array.isArray(dealerPayload?.data) ? dealerPayload!.data! : [])
            .map((item) => ({
              id: Number(item.id ?? item.dealer_id ?? 0),
              dealer_name: String(item.dealer_name ?? item.name ?? item.title ?? "").trim(),
              is_active: item.is_active as boolean | number | undefined,
            }))
            .filter((item) => Number.isInteger(item.id) && item.id > 0 && item.is_active !== false && Number(item.is_active) !== 0);
          setDealers(normalized);
          if (requestedDealerId && normalized.some((item) => item.id === requestedDealerId)) {
            setListingOwnerType("dealer");
            setSelectedDealerId(String(requestedDealerId));
          }
        }
        setBrands(brandItems);
        setProvinces(geo.data);
      } catch {
        setError("اطلاعات لازم برای ثبت آگهی دریافت نشد. دوباره تلاش کنید.");
      } finally {
        setBooting(false);
      }
    })();
  }, [requestedDealerId]);

  useEffect(() => {
    return () => imageUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  useEffect(() => {
    setVehicleModelCode("");
    setVehicleCustomModelName("");
    if (!vehicleBrandCode) {
      setModels([]);
      return;
    }
    void fetchModels(vehicleBrandCode).then(setModels).catch(() => setModels([]));
  }, [vehicleBrandCode]);

  useEffect(() => {
    setCity("");
    setNeighborhood("");
    setNeighborhoods([]);
    setCityHasNeighborhoods(false);
    if (!province) {
      setCities([]);
      return;
    }
    void fetchGeo({ province }).then((result) => setCities(result.data)).catch(() => setCities([]));
  }, [province]);

  useEffect(() => {
    setNeighborhood("");
    setNeighborhoods([]);
    setCityHasNeighborhoods(false);
    if (!province || !city) return;
    void fetchGeo({ province, city }).then((result) => {
      setNeighborhoods(result.data);
      setCityHasNeighborhoods(result.hasNeighborhoods || result.data.length > 0);
    }).catch(() => undefined);
  }, [province, city]);

  const selectedBrand = brands.find((item) => item.code === vehicleBrandCode) || null;
  const selectedModel = models.find((item) => item.code === vehicleModelCode) || null;
  const brandName = selectedBrand?.name_fa || "";
  const modelName = selectedModel?.code === "other" ? vehicleCustomModelName.trim() : selectedModel?.name_fa || "";
  const selectedCategory = saleStatuses.find((item) => item.code === categoryCode) || saleStatuses[1];
  const selectedDealer = dealers.find((item) => String(item.id) === selectedDealerId) || null;
  const ownerLabel = listingOwnerType === "dealer"
    ? selectedDealer?.dealer_name || "نمایشگاه"
    : user?.display_name || user?.full_name || "شخصی";
  const locationLabel = [province, city, cityHasNeighborhoods ? neighborhood : ""].filter(Boolean).join("، ") || "موقعیت ثبت نشده";
  const selectedCover = images.find((item) => item.localId === coverLocalId) || images[0] || null;

  const ownerOk = listingOwnerType === "personal" || Number(selectedDealerId) > 0;
  const customModelOk = vehicleModelCode !== "other" || vehicleCustomModelName.trim().length >= 2;
  const neighborhoodOk = !cityHasNeighborhoods || neighborhood.trim().length >= 2;
  const canSubmit = Boolean(ownerOk && title.trim().length >= 5 && vehicleBrandCode && vehicleModelCode && customModelOk && productionYear.length >= 4 && province && city && neighborhoodOk && loggedIn);

  function stepValid(step: number) {
    if (step === 1) return ownerOk;
    if (step === 2) return Boolean(categoryCode);
    if (step === 3) return Boolean(vehicleBrandCode && vehicleModelCode && customModelOk);
    if (step === 4) return title.trim().length >= 5 && productionYear.length >= 4;
    if (step === 5) return true;
    if (step === 6) return Boolean(province && city && neighborhoodOk);
    if (step === 7) return true;
    return canSubmit;
  }

  function goStep(next: number) {
    const safe = Math.max(1, Math.min(formSteps.length, next));
    if (safe > activeStep && !stepValid(activeStep)) {
      setError("اطلاعات لازم این مرحله را کامل کنید.");
      return;
    }
    setError("");
    setActiveStep(safe);
    setMaxVisited((current) => Math.max(current, safe));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function addImages(files: FileList | null) {
    if (!files?.length) return;
    const remaining = Math.max(0, MAX_IMAGES - images.length);
    const selected = Array.from(files).slice(0, remaining);
    if (!selected.length) return;
    setProcessingImages(true);
    setError("");
    try {
      const next: ImageItem[] = [];
      for (const file of selected) {
        if (!file.type.startsWith("image/")) continue;
        const optimized = await optimizeImage(file);
        const previewUrl = URL.createObjectURL(optimized);
        imageUrlsRef.current.push(previewUrl);
        next.push({ localId: makeLocalId(), file: optimized, previewUrl, status: "selected", progress: 0 });
      }
      setImages((current) => {
        const combined = [...current, ...next];
        if (!coverLocalId && combined[0]) setCoverLocalId(combined[0].localId);
        return combined;
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "پردازش تصویر انجام نشد.");
    } finally {
      setProcessingImages(false);
    }
  }

  function removeImage(localId: string) {
    setImages((current) => {
      const target = current.find((item) => item.localId === localId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      const next = current.filter((item) => item.localId !== localId);
      if (coverLocalId === localId) setCoverLocalId(next[0]?.localId || null);
      return next;
    });
  }

  async function setServerCover(listingId: number, imageId: number) {
    const response = await fetch(`${API_BASE}/api/set-listing-cover-image.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ listing_id: listingId, image_id: imageId }),
    });
    const payload = await readJson<{ success?: boolean; message?: string }>(response);
    if (!response.ok || !payload?.success) throw new Error(payload?.message || "انتخاب عکس اصلی ذخیره نشد.");
  }

  async function uploadPendingImages(listingId: number) {
    let failed = 0;
    let coverImageId = 0;
    for (const snapshot of images) {
      if (snapshot.status === "uploaded") {
        if (snapshot.localId === coverLocalId && snapshot.imageId) coverImageId = snapshot.imageId;
        continue;
      }
      setImages((current) => current.map((item) => item.localId === snapshot.localId ? { ...item, status: "uploading", progress: 4, error: "" } : item));
      try {
        const payload = await uploadImage(listingId, snapshot, (progress) => {
          setImages((current) => current.map((item) => item.localId === snapshot.localId ? { ...item, progress } : item));
        });
        const imageId = Number(payload.image_id || 0);
        if (!payload.success || !payload.image_url || !imageId) throw new Error(payload.message || "آپلود تصویر انجام نشد.");
        if (snapshot.localId === coverLocalId) coverImageId = imageId;
        setImages((current) => current.map((item) => item.localId === snapshot.localId ? { ...item, status: "uploaded", progress: 100, imageId, imageUrl: payload.image_url } : item));
      } catch (caught) {
        failed += 1;
        setImages((current) => current.map((item) => item.localId === snapshot.localId ? { ...item, status: "error", progress: 0, error: caught instanceof Error ? caught.message : "آپلود انجام نشد." } : item));
      }
    }
    if (coverImageId) await setServerCover(listingId, coverImageId);
    return failed;
  }

  async function finalizeListing(listingId: number) {
    const response = await fetch(`${API_BASE}/api/finalize-listing.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ listing_id: listingId }),
    });
    const payload = await readJson<{ success?: boolean; message?: string; published?: boolean | number | string }>(response);
    if (!response.ok || !payload?.success) throw new Error(payload?.message || "بررسی نهایی آگهی انجام نشد.");
    return payload;
  }

  async function finishCreatedListing(listingId: number) {
    const failed = await uploadPendingImages(listingId);
    if (failed > 0) {
      setError(`${failed.toLocaleString("fa-IR")} تصویر آپلود نشد. تصاویر ناموفق را بررسی کنید و «تلاش دوباره» را بزنید.`);
      return;
    }
    try {
      const final = await finalizeListing(listingId);
      const published = final.published === true || final.published === 1 || final.published === "1" || final.published === "true";
      setNotice(published ? "آگهی تأیید و منتشر شد." : "آگهی ثبت شد و برای بررسی چاکود ارسال شد.");
    } catch (caught) {
      setNotice("آگهی ثبت شد و بررسی نهایی آن در صف چاکود قرار گرفت.");
      setError(caught instanceof Error ? caught.message : "بررسی نهایی انجام نشد.");
    }
    window.setTimeout(() => window.location.assign(`/account/listings/${listingId}`), 1300);
  }

  async function submitListing() {
    if (!canSubmit || submitting || createdListingId) return;
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API_BASE}/api/submit-listing.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          listing_owner_type: listingOwnerType,
          dealer_id: listingOwnerType === "dealer" ? Number(selectedDealerId) : null,
          category_code: categoryCode,
          vehicle_market_level: "standard",
          vehicle_body_type: selectedModel?.body_hint || "",
          vehicle_brand_code: vehicleBrandCode,
          vehicle_model_code: vehicleModelCode,
          vehicle_trim_code: "",
          vehicle_custom_model_name: vehicleModelCode === "other" ? vehicleCustomModelName.trim() : "",
          brand: brandName,
          model: modelName,
          trim_name: "",
          title: title.trim(),
          production_year: productionYear,
          mileage_km: cleanNumber(mileageKm),
          price_toman: cleanNumber(priceToman),
          province,
          city,
          neighborhood: cityHasNeighborhoods ? neighborhood : "",
          latitude: "",
          longitude: "",
          location_accuracy_m: "",
          location_label: locationLabel,
          location_source: "manual",
          color,
          body_status: bodyStatus,
          transmission,
          fuel_type: fuelType,
          description: description.trim(),
        }),
      });
      const payload = await readJson<{ success?: boolean; message?: string; listing_id?: number | string }>(response);
      const listingId = Number(payload?.listing_id || 0);
      if (!response.ok || !payload?.success || !listingId) throw new Error(payload?.message || "ثبت آگهی انجام نشد.");
      setCreatedListingId(listingId);
      setNotice("آگهی ساخته شد؛ تصاویر و بررسی نهایی در حال انجام است.");
      await finishCreatedListing(listingId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ارتباط با سرور برقرار نشد.");
    } finally {
      setSubmitting(false);
    }
  }

  async function retryCreatedListing() {
    if (!createdListingId || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await finishCreatedListing(createdListingId);
    } finally {
      setSubmitting(false);
    }
  }

  const progress = Math.round((activeStep / formSteps.length) * 100);

  if (booting) {
    return <main className={styles.page} dir="rtl"><div className={styles.shell}><section className={styles.stateCard}><span className={styles.loader} /><h1>در حال آماده‌سازی ثبت آگهی</h1><p>اطلاعات حساب، خودرو و موقعیت در حال دریافت است.</p></section></div></main>;
  }

  if (!loggedIn) {
    return <main className={styles.page} dir="rtl"><div className={styles.shell}><section className={styles.stateCard}><h1>برای ثبت آگهی وارد حساب شوید</h1><p>بعد از ورود، اطلاعاتی که برای ساخت آگهی لازم است در همین مسیر تکمیل می‌شود.</p><Link href={`/login?returnTo=${encodeURIComponent("/account/listings/new")}`}>ورود به چاکود</Link></section></div></main>;
  }

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <Link href={requestedDealerId ? `/account/business?dealer_id=${requestedDealerId}&tab=listings` : "/account/listings"} className={styles.back}>بازگشت</Link>
          <Link href="/" className={styles.brand}><img src="/brand/chakod-logo-horizontal.png" alt="چاکود" /></Link>
          <span className={styles.topbarSpacer} />
        </header>

        <section className={styles.hero}>
          <span className={styles.heroEyebrow}>ثبت آگهی خودرو</span>
          <h1>اول بساز، بعد مثل خریدار ببین</h1>
          <p>اطلاعات را مرحله‌ای وارد کن. قبل از ثبت نهایی، آگهی دقیقاً در قالبی شبیه نسخه عمومی نمایش داده می‌شود تا متن، عکس، قیمت و مشخصات را یک‌بار کامل کنترل کنی.</p>
        </section>

        <section className={styles.progressCard}>
          <div className={styles.progressTop}><div><span>مرحله {activeStep.toLocaleString("fa-IR")} از {formSteps.length.toLocaleString("fa-IR")}</span><strong>{formSteps[activeStep - 1].title}</strong></div><em>{progress.toLocaleString("fa-IR")}٪</em></div>
          <div className={styles.progressTrack}><span style={{ width: `${progress}%` }} /></div>
          <div className={styles.stepRail}>
            {formSteps.map((step) => {
              const done = step.id < activeStep && stepValid(step.id);
              return <button key={step.id} type="button" disabled={step.id > maxVisited + 1 || Boolean(createdListingId)} className={`${styles.stepButton} ${step.id === activeStep ? styles.stepButtonActive : ""} ${done ? styles.stepButtonDone : ""}`} onClick={() => goStep(step.id)}><span>{done ? "✓" : step.id.toLocaleString("fa-IR")}</span>{step.short}</button>;
            })}
          </div>
        </section>

        <div className={styles.layout}>
          {activeStep === 1 ? <section className={`${styles.card} ${styles.formCard}`}>
            <div className={styles.stepHead}><span>مرحله ۱</span><h2>این آگهی برای کدام هویت است؟</h2><p>آگهی شخصی از حساب خودت منتشر می‌شود؛ آگهی نمایشگاهی به همان مجموعه متصل می‌ماند.</p></div>
            <div className={styles.ownerGrid}>
              <button type="button" className={`${styles.choiceCard} ${listingOwnerType === "personal" ? styles.choiceCardActive : ""}`} onClick={() => { setListingOwnerType("personal"); setSelectedDealerId(""); }}><span className={styles.choiceIcon}>👤</span><span><strong>شخصی</strong><small>{user?.display_name || user?.full_name || "حساب شخصی"}</small></span></button>
              {dealers.map((dealer) => <button key={dealer.id} type="button" className={`${styles.choiceCard} ${listingOwnerType === "dealer" && selectedDealerId === String(dealer.id) ? styles.choiceCardActive : ""}`} onClick={() => { setListingOwnerType("dealer"); setSelectedDealerId(String(dealer.id)); }}><span className={styles.choiceIcon}>🏢</span><span><strong>{dealer.dealer_name || `نمایشگاه ${dealer.id}`}</strong><small>انتشار به نام مجموعه</small></span></button>)}
            </div>
          </section> : null}

          {activeStep === 2 ? <section className={`${styles.card} ${styles.formCard}`}>
            <div className={styles.stepHead}><span>مرحله ۲</span><h2>نوع فروش خودرو</h2><p>این انتخاب به خریدار می‌گوید با چه نوع آگهی‌ای روبه‌رو است.</p></div>
            <div className={styles.saleGrid}>{saleStatuses.map((item) => <button key={item.code} type="button" className={`${styles.choiceCard} ${categoryCode === item.code ? styles.choiceCardActive : ""}`} onClick={() => setCategoryCode(item.code)}><span className={styles.choiceIcon}>{item.icon}</span><span><strong>{item.title}</strong><small>{item.subtitle}</small></span></button>)}</div>
          </section> : null}

          {activeStep === 3 ? <section className={`${styles.card} ${styles.formCard}`}>
            <div className={styles.stepHead}><span>مرحله ۳</span><h2>خودرو را انتخاب کن</h2><p>برند و مدل از کاتالوگ چاکود انتخاب می‌شوند تا جستجو و فیلتر دقیق بماند.</p></div>
            <div className={styles.twoCol}>
              <label className={styles.field}><span>برند</span><select value={vehicleBrandCode} onChange={(event) => setVehicleBrandCode(event.target.value)}><option value="">انتخاب برند</option>{brands.map((item) => <option key={item.code} value={item.code}>{item.name_fa}</option>)}</select></label>
              <label className={styles.field}><span>مدل</span><select value={vehicleModelCode} disabled={!vehicleBrandCode} onChange={(event) => setVehicleModelCode(event.target.value)}><option value="">انتخاب مدل</option>{models.map((item) => <option key={item.code} value={item.code}>{item.name_fa}</option>)}</select></label>
            </div>
            {vehicleModelCode === "other" ? <label className={styles.field} style={{ marginTop: 10 }}><span>نام مدل</span><input value={vehicleCustomModelName} onChange={(event) => setVehicleCustomModelName(event.target.value)} placeholder="نام دقیق مدل خودرو" /></label> : null}
          </section> : null}

          {activeStep === 4 ? <section className={`${styles.card} ${styles.formCard}`}>
            <div className={styles.stepHead}><span>مرحله ۴</span><h2>اطلاعاتی که خریدار اول می‌بیند</h2><p>عنوان، سال، کارکرد و قیمت باید کوتاه و دقیق باشند.</p></div>
            <div className={styles.twoCol}>
              <label className={styles.field}><span>عنوان آگهی</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={`مثلاً ${brandName || "پژو"} ${modelName || "۲۰۷"} تمیز`} /></label>
              <label className={styles.field}><span>سال تولید</span><select value={productionYear} onChange={(event) => setProductionYear(event.target.value)}><option value="">انتخاب سال</option><optgroup label="شمسی">{persianYears.map((year) => <option key={`p-${year}`} value={year}>{year}</option>)}</optgroup><optgroup label="میلادی">{gregorianYears.map((year) => <option key={`g-${year}`} value={year}>{year}</option>)}</optgroup></select></label>
              <label className={styles.field}><span>کارکرد</span><input inputMode="numeric" value={formatInputNumber(mileageKm)} onChange={(event) => setMileageKm(cleanNumber(event.target.value))} placeholder="مثلاً 80,000" /><small className={styles.fieldHint}>کیلومتر</small></label>
              <label className={styles.field}><span>قیمت</span><input inputMode="numeric" value={formatInputNumber(priceToman)} onChange={(event) => setPriceToman(cleanNumber(event.target.value))} placeholder="مثلاً 5,000,000,000" /><small className={styles.fieldHint}>تومان؛ خالی بگذارید = توافقی</small></label>
            </div>
          </section> : null}

          {activeStep === 5 ? <section className={`${styles.card} ${styles.formCard}`}>
            <div className={styles.stepHead}><span>مرحله ۵</span><h2>وضعیت خودرو و توضیحات</h2><p>این بخش همان چیزی است که خریدار برای تصمیم اولیه می‌خواند.</p></div>
            <div className={styles.fourCol}>
              <label className={styles.field}><span>رنگ</span><select value={color} onChange={(event) => setColor(event.target.value)}><option value="">انتخاب رنگ</option>{colors.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className={styles.field}><span>بدنه</span><select value={bodyStatus} onChange={(event) => setBodyStatus(event.target.value)}><option>سالم</option><option>خط و خش جزئی</option><option>یک لکه رنگ</option><option>چند لکه رنگ</option><option>دور رنگ</option><option>تصادفی</option></select></label>
              <label className={styles.field}><span>گیربکس</span><select value={transmission} onChange={(event) => setTransmission(event.target.value)}><option>اتوماتیک</option><option>دنده‌ای</option></select></label>
              <label className={styles.field}><span>سوخت</span><select value={fuelType} onChange={(event) => setFuelType(event.target.value)}><option>بنزین</option><option>هیبرید</option><option>برقی</option><option>دوگانه‌سوز</option><option>دیزل</option></select></label>
            </div>
            <label className={styles.field} style={{ marginTop: 10 }}><span>توضیحات آگهی</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="وضعیت خودرو، بیمه، آپشن‌ها، سرویس‌ها و شرایط فروش را همان‌طور که می‌خواهی خریدار بخواند بنویس..." /></label>
          </section> : null}

          {activeStep === 6 ? <section className={`${styles.card} ${styles.formCard}`}>
            <div className={styles.stepHead}><span>مرحله ۶</span><h2>موقعیت آگهی</h2><p>موقعیت عمومی آگهی برای جستجو و نمایش به خریداران استفاده می‌شود.</p></div>
            <div className={styles.twoCol}>
              <label className={styles.field}><span>استان</span><select value={province} onChange={(event) => setProvince(event.target.value)}><option value="">انتخاب استان</option>{provinces.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className={styles.field}><span>شهر</span><select value={city} disabled={!province} onChange={(event) => setCity(event.target.value)}><option value="">انتخاب شهر</option>{cities.map((item) => <option key={item}>{item}</option>)}</select></label>
              {cityHasNeighborhoods ? <label className={styles.field}><span>محله</span><select value={neighborhood} onChange={(event) => setNeighborhood(event.target.value)}><option value="">انتخاب محله</option>{neighborhoods.map((item) => <option key={item}>{item}</option>)}</select></label> : null}
            </div>
          </section> : null}

          {activeStep === 7 ? <section className={`${styles.card} ${styles.formCard}`}>
            <div className={styles.stepHead}><span>مرحله ۷</span><h2>تصاویر خودرو</h2><p>عکس اصلی همان تصویری است که در پیش‌نمایش و کارت آگهی دیده می‌شود. حداکثر ۱۰ تصویر.</p></div>
            <label className={styles.imagePicker}><strong>{processingImages ? "در حال آماده‌سازی تصاویر..." : "+ انتخاب تصاویر"}</strong><small>JPG، PNG یا WebP؛ تصاویر قبل از آپلود بهینه می‌شوند.</small><input type="file" accept="image/*" multiple disabled={processingImages || images.length >= MAX_IMAGES} onChange={(event) => { void addImages(event.target.files); event.target.value = ""; }} /></label>
            {images.length ? <div className={styles.imageGrid} style={{ marginTop: 10 }}>{images.map((item) => <article key={item.localId} className={styles.imageItem}>{coverLocalId === item.localId ? <span className={styles.coverBadge}>عکس اصلی</span> : null}<img src={item.previewUrl} alt="پیش‌نمایش خودرو" /><div className={styles.imageMeta}>{item.status === "uploading" ? <small>{item.progress.toLocaleString("fa-IR")}٪ آپلود</small> : item.error ? <small style={{ color: "#a52d43" }}>{item.error}</small> : null}<div className={styles.imageActions}><button type="button" className={styles.coverButton} onClick={() => setCoverLocalId(item.localId)}>انتخاب اصلی</button><button type="button" className={styles.removeButton} disabled={Boolean(createdListingId)} onClick={() => removeImage(item.localId)}>حذف</button></div></div></article>)}</div> : <div className={styles.inlineNotice}>بدون عکس هم می‌توانی پیش‌نمایش را ببینی؛ اما برای آگهی حرفه‌ای بهتر است حداقل یک تصویر واضح انتخاب کنی.</div>}
          </section> : null}

          {activeStep === 8 ? <section className={`${styles.card} ${styles.formCard}`}>
            <div className={styles.stepHead}><span>مرحله ۸ · قبل از ثبت</span><h2>آگهی را مثل خریدار ببین</h2><p>این مرحله برای کنترل نهایی است. هنوز چیزی منتشر نشده؛ متن، قیمت، عکس و مشخصات را بخوان و اگر لازم بود به مرحله مربوط برگرد.</p></div>
            <div className={styles.previewStage}>
              <div className={styles.previewTop}><strong>پیش‌نمایش نسخه عمومی</strong><span>فقط برای کنترل قبل از ثبت</span></div>
              <div className={styles.publicPreview}>
                <div className={styles.previewMedia}>{selectedCover ? <img src={selectedCover.previewUrl} alt={title || "تصویر خودرو"} /> : <div className={styles.previewNoImage}><span>چ</span><small>هنوز تصویری انتخاب نشده</small></div>}{images.length ? <span className={styles.previewImageCount}>{images.length.toLocaleString("fa-IR")} تصویر</span> : null}</div>
                <div className={styles.previewBody}>
                  <div className={styles.previewBadges}><span>{selectedCategory.title}</span><span>{listingOwnerType === "dealer" ? "نمایشگاهی" : "شخصی"}</span></div>
                  <h2>{title.trim() || "عنوان آگهی"}</h2>
                  <p className={styles.previewVehicle}>{[brandName, modelName, productionYear].filter(Boolean).join(" · ") || "مشخصات خودرو"}</p>
                  <div className={styles.previewPrice}><span>قیمت</span><strong>{formatPrice(priceToman)}</strong></div>
                  <div className={styles.previewStats}><div><span>کارکرد</span><strong>{cleanNumber(mileageKm) ? `${Number(cleanNumber(mileageKm)).toLocaleString("fa-IR")} کیلومتر` : "ثبت نشده"}</strong></div><div><span>بدنه</span><strong>{bodyStatus || "ثبت نشده"}</strong></div><div><span>گیربکس</span><strong>{transmission}</strong></div><div><span>سوخت</span><strong>{fuelType}</strong></div></div>
                  <div className={styles.previewSection}><h3>توضیحات فروشنده</h3><p>{description.trim() || "برای این آگهی توضیحی نوشته نشده است."}</p></div>
                  <div className={styles.previewSeller}><span className={styles.previewSellerIcon}>چ</span><div><strong>{ownerLabel}</strong><small>{locationLabel}</small></div></div>
                  <div className={styles.previewFakeActions}><span>تماس با فروشنده</span><span>ذخیره</span><span>اشتراک</span></div>
                </div>
              </div>
            </div>
            <div className={styles.previewNote}>بعد از زدن «تأیید و ثبت آگهی»، اطلاعات برای بررسی چاکود ارسال می‌شود. این پیش‌نمایش جای صفحه مدیریت آگهی را نمی‌گیرد؛ فقط مرحله کنترل قبل از ثبت است.</div>
            {notice ? <div className={styles.success}>{notice}</div> : null}
            {error ? <div className={styles.error}>{error}</div> : null}
          </section> : null}
        </div>

        {activeStep !== 8 && error ? <div className={styles.error}>{error}</div> : null}
        {activeStep !== 8 && notice ? <div className={styles.success}>{notice}</div> : null}

        <div className={styles.actions}>
          <button type="button" className={styles.backButton} disabled={activeStep === 1 || submitting} onClick={() => goStep(activeStep - 1)}>مرحله قبل</button>
          {activeStep < 8 ? <button type="button" className={styles.nextButton} disabled={!stepValid(activeStep) || processingImages} onClick={() => goStep(activeStep + 1)}>{activeStep === 7 ? "دیدن پیش‌نمایش" : `ادامه؛ ${formSteps[activeStep].title}`}</button> : createdListingId && error ? <button type="button" className={styles.submitButton} disabled={submitting} onClick={() => void retryCreatedListing()}>{submitting ? "در حال تلاش..." : "تلاش دوباره و تکمیل ثبت"}</button> : <button type="button" className={styles.submitButton} disabled={!canSubmit || submitting || Boolean(createdListingId)} onClick={() => void submitListing()}>{submitting ? "در حال ثبت..." : createdListingId ? "آگهی ثبت شد" : "تأیید و ثبت آگهی"}</button>}
        </div>
      </div>
      <MobileBottomNav />
    </main>
  );
}
