"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { AccountUser } from "./ProfileEditor";
import styles from "./ProfessionalProfileEditor.module.css";

const LOCAL_DEV_SESSION_TOKEN = "chakod-local-dev-session";
const LOCAL_PROFILE_KEY = "chakod_professional_profile_v16";
const IS_LOCAL_DEV = process.env.NODE_ENV === "development";
const DAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"] as const;

type BusinessType = "dealer" | "parts_store" | "repair_shop" | "car_service";

type CategoryOption = { key: string; label: string };

const CATEGORY_CATALOG: Record<BusinessType, CategoryOption[]> = {
  dealer: [
    { key: "vehicle_sales", label: "فروش خودرو" },
    { key: "vehicle_purchase", label: "خرید خودرو" },
    { key: "vehicle_exchange", label: "تعویض خودرو" },
    { key: "consignment_sales", label: "فروش امانی" },
    { key: "financing", label: "فروش اقساطی و تأمین مالی" },
  ],
  repair_shop: [
    { key: "mechanical", label: "مکانیکی" },
    { key: "auto_electrical", label: "برق خودرو" },
    { key: "battery", label: "باتری‌سازی" },
    { key: "suspension", label: "جلوبندی" },
    { key: "engine_tune", label: "تنظیم موتور" },
    { key: "gearbox", label: "تعمیر گیربکس" },
    { key: "engine_repair", label: "تعمیر موتور" },
    { key: "oil_change", label: "تعویض روغن و سرویس دوره‌ای" },
    { key: "body_paint", label: "صافکاری و نقاشی" },
    { key: "tire_service", label: "لاستیک و آپاراتی" },
    { key: "air_conditioning", label: "کولر خودرو" },
    { key: "exhaust", label: "اگزوزسازی" },
    { key: "diagnostics", label: "دیاگ و عیب‌یابی" },
    { key: "roadside_assistance", label: "امداد خودرو" },
    { key: "other_repair", label: "سایر تعمیرات" },
  ],
  car_service: [
    { key: "car_wash", label: "کارواش" },
    { key: "mobile_car_wash", label: "کارواش سیار" },
    { key: "interior_cleaning", label: "صفرشویی و نظافت داخل" },
    { key: "detailing", label: "دیتیلینگ خودرو" },
    { key: "polishing", label: "پولیش و واکس" },
    { key: "ceramic_coating", label: "سرامیک بدنه" },
    { key: "paint_restoration", label: "احیای رنگ" },
    { key: "window_tint", label: "شیشه دودی" },
    { key: "vehicle_wrap", label: "کاور بدنه" },
    { key: "ppf", label: "محافظ رنگ PPF" },
    { key: "accessories_installation", label: "نصب لوازم جانبی" },
    { key: "audio_alarm", label: "سیستم صوتی، دزدگیر و ردیاب" },
    { key: "seat_cover_floor_mat", label: "روکش صندلی و کف‌پوش" },
    { key: "auto_glass", label: "شیشه خودرو" },
    { key: "headlight_restoration", label: "ترمیم چراغ" },
    { key: "mobile_service", label: "خدمات در محل" },
    { key: "other_car_service", label: "سایر خدمات زیبایی و رفاهی" },
  ],
  parts_store: [
    { key: "spare_parts", label: "قطعات یدکی" },
    { key: "consumables", label: "لوازم مصرفی" },
    { key: "oil_filter", label: "روغن و فیلتر" },
    { key: "battery", label: "باتری" },
    { key: "tire_wheel", label: "لاستیک و رینگ" },
    { key: "accessories", label: "لوازم جانبی" },
    { key: "decorative_parts", label: "لوازم تزئینی" },
    { key: "audio_equipment", label: "تجهیزات صوتی" },
    { key: "body_parts", label: "قطعات بدنه" },
    { key: "used_parts", label: "قطعات استوک" },
    { key: "other_parts", label: "سایر قطعات" },
  ],
};


type BusinessHour = {
  day: string;
  enabled: boolean;
  open: string;
  close: string;
};

type CompletionChecks = {
  name?: boolean;
  phone?: boolean;
  location?: boolean;
  address?: boolean;
  services?: boolean;
  logo?: boolean;
  description?: boolean;
  hours?: boolean;
  map?: boolean;
  gallery?: boolean;
};

export type ProfessionalProfile = {
  dealer_id?: number | null;
  business_type: BusinessType;
  name: string;
  phone: string;
  whatsapp_phone: string;
  email: string;
  website_url: string;
  instagram_url: string;
  province: string;
  city: string;
  neighborhood: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  logo_url: string;
  cover_url: string;
  description: string;
  business_hours: BusinessHour[];
  services: string[];
  service_categories: string[];
  mobile_service: boolean;
  price_range_text: string;
  gallery: string[];
  public_slug?: string;
  is_verified?: boolean;
  profile_status?: "draft" | "complete";
  moderation_status?: "pending" | "approved" | "rejected" | "suspended";
  moderation_note?: string | null;
  home_featured?: boolean;
  profile_complete?: boolean;
  completion_percent?: number;
  completion_checks?: CompletionChecks;
};

type ProfileResponse = {
  success?: boolean;
  message?: string;
  profile?: ProfessionalProfile;
  user?: AccountUser;
};

type UploadResponse = {
  success?: boolean;
  message?: string;
  url?: string;
};

type GeoResponse = {
  success?: boolean;
  data?: string[];
  message?: string;
};

type ProfessionalProfileEditorProps = {
  user: AccountUser;
  onUserUpdated?: (user: AccountUser) => void;
};

const GEO_MEMORY = new Map<string, string[]>();

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("chakod_session_token") || "";
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token
    ? { Authorization: `Bearer ${token}`, "X-Session-Token": token }
    : {};
}

function cleanList(values: unknown, maxItems: number) {
  if (!Array.isArray(values)) return [];
  return Array.from(
    new Set(values.map((value) => String(value || "").trim()).filter(Boolean)),
  ).slice(0, maxItems);
}

function defaultHours(): BusinessHour[] {
  return DAYS.map((day, index) => ({
    day,
    enabled: index !== 6,
    open: "09:00",
    close: "18:00",
  }));
}

function normalizeHours(value: unknown): BusinessHour[] {
  const rows = Array.isArray(value) ? value : [];
  const map = new Map<string, BusinessHour>();

  rows.forEach((row) => {
    if (!row || typeof row !== "object") return;
    const item = row as Partial<BusinessHour>;
    if (!DAYS.includes(item.day as (typeof DAYS)[number])) return;
    map.set(String(item.day), {
      day: String(item.day),
      enabled: Boolean(item.enabled),
      open: /^\d{2}:\d{2}$/.test(String(item.open || "")) ? String(item.open) : "09:00",
      close: /^\d{2}:\d{2}$/.test(String(item.close || "")) ? String(item.close) : "18:00",
    });
  });

  return DAYS.map((day, index) =>
    map.get(day) || {
      day,
      enabled: index !== 6,
      open: "09:00",
      close: "18:00",
    },
  );
}

function primaryLocationFromUser(user: AccountUser) {
  const scope = Array.isArray(user.business_location_scopes)
    ? user.business_location_scopes[0]
    : null;
  const area = scope?.areas?.[0];

  return {
    province: scope?.province || "",
    city: scope?.cities?.[0] || area?.city || "",
    neighborhood: area?.neighborhoods?.[0] || "",
  };
}

function businessTypeFromUser(user: AccountUser): BusinessType {
  if (user.account_type === "parts_store") return "parts_store";
  if (user.account_type === "repair_shop") return "repair_shop";
  if (user.account_type === "car_service") return "car_service";
  return "dealer";
}

function emptyProfile(user: AccountUser): ProfessionalProfile {
  const location = primaryLocationFromUser(user);
  return {
    business_type: businessTypeFromUser(user),
    name: user.business_name || "",
    phone: "",
    whatsapp_phone: "",
    email: "",
    website_url: "",
    instagram_url: "",
    province: location.province,
    city: location.city,
    neighborhood: location.neighborhood,
    address: "",
    latitude: null,
    longitude: null,
    logo_url: "",
    cover_url: "",
    description: "",
    business_hours: defaultHours(),
    services: [],
    service_categories: [],
    mobile_service: false,
    price_range_text: "",
    gallery: [],
    profile_status: "draft",
    moderation_status: "pending",
    profile_complete: false,
    completion_percent: 0,
    completion_checks: {},
  };
}

function normalizeProfile(value: Partial<ProfessionalProfile> | undefined, user: AccountUser) {
  const fallback = emptyProfile(user);
  return {
    ...fallback,
    ...value,
    business_type: businessTypeFromUser(user),
    name: String(value?.name || fallback.name),
    phone: String(value?.phone || ""),
    whatsapp_phone: String(value?.whatsapp_phone || ""),
    email: String(value?.email || ""),
    website_url: String(value?.website_url || ""),
    instagram_url: String(value?.instagram_url || ""),
    province: String(value?.province || fallback.province),
    city: String(value?.city || fallback.city),
    neighborhood: String(value?.neighborhood || fallback.neighborhood),
    address: String(value?.address || ""),
    latitude:
      value?.latitude === null || value?.latitude === undefined
        ? null
        : Number(value.latitude),
    longitude:
      value?.longitude === null || value?.longitude === undefined
        ? null
        : Number(value.longitude),
    logo_url: String(value?.logo_url || ""),
    cover_url: String(value?.cover_url || ""),
    description: String(value?.description || ""),
    business_hours: normalizeHours(value?.business_hours),
    services: cleanList(value?.services, 20),
    service_categories: cleanList(value?.service_categories, 20).filter((key) =>
      CATEGORY_CATALOG[businessTypeFromUser(user)].some((item) => item.key === key),
    ),
    mobile_service: Boolean(value?.mobile_service),
    price_range_text: String(value?.price_range_text || ""),
    gallery: cleanList(value?.gallery, 8),
  } satisfies ProfessionalProfile;
}

function computeCompletion(profile: ProfessionalProfile) {
  const checks: Required<CompletionChecks> = {
    name: profile.name.trim().length >= 2,
    phone: profile.phone.replace(/\D/g, "").length >= 7,
    location: Boolean(profile.province.trim() && profile.city.trim()),
    address: profile.address.trim().length >= 5,
    services: profile.services.length > 0 || profile.service_categories.length > 0,
    logo: Boolean(profile.logo_url),
    description: profile.description.trim().length >= 20,
    hours: profile.business_hours.some((row) => row.enabled),
    map: profile.latitude !== null && profile.longitude !== null,
    gallery: Boolean(profile.cover_url || profile.gallery.length),
  };

  const weights: Record<keyof CompletionChecks, number> = {
    name: 10,
    phone: 15,
    location: 15,
    address: 10,
    services: 10,
    logo: 10,
    description: 10,
    hours: 10,
    map: 5,
    gallery: 5,
  };

  const percent = (Object.keys(checks) as (keyof CompletionChecks)[]).reduce(
    (total, key) => total + (checks[key] ? weights[key] : 0),
    0,
  );

  return {
    checks,
    percent,
    complete: checks.name && checks.phone && checks.location && checks.address && checks.services,
  };
}

async function readJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function fetchGeo(params?: { province?: string; city?: string }) {
  const key = `${params?.province || "all"}::${params?.city || ""}`;
  const cached = GEO_MEMORY.get(key);
  if (cached) return cached;

  const search = new URLSearchParams();
  if (params?.province) search.set("province", params.province);
  if (params?.city) search.set("city", params.city);

  const response = await fetch(`/api/geo-locations${search.size ? `?${search}` : ""}`, {
    cache: "default",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  const result = await readJson<GeoResponse>(response);
  if (!response.ok || !result?.success || !Array.isArray(result.data)) {
    throw new Error(result?.message || "دریافت فهرست موقعیت انجام نشد.");
  }

  const data = Array.from(new Set(result.data.map((item) => String(item).trim()).filter(Boolean)));
  GEO_MEMORY.set(key, data);
  return data;
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("READ_FAILED"));
    reader.readAsDataURL(file);
  });
}

function typeTitle(type: BusinessType) {
  if (type === "parts_store") return "فروشگاه قطعات و لوازم خودرو";
  if (type === "repair_shop") return "تعمیرگاه خودرو";
  if (type === "car_service") return "مرکز خدمات خودرو";
  return "نمایشگاه خودرو";
}

function categoryLabel(type: BusinessType, key: string) {
  return CATEGORY_CATALOG[type].find((item) => item.key === key)?.label || key;
}

export default function ProfessionalProfileEditor({
  user,
  onUserUpdated,
}: ProfessionalProfileEditorProps) {
  const [profile, setProfile] = useState<ProfessionalProfile>(() => emptyProfile(user));
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "cover" | "gallery" | "">("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [serviceInput, setServiceInput] = useState("");
  const [provinces, setProvinces] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [locating, setLocating] = useState(false);

  const completion = useMemo(() => computeCompletion(profile), [profile]);
  const professional = user.account_type !== "personal" && user.account_type !== "business";

  useEffect(() => {
    if (!professional) return;

    let cancelled = false;
    async function loadProfile() {
      setLoading(true);
      setError("");

      try {
        if (IS_LOCAL_DEV && getToken() === LOCAL_DEV_SESSION_TOKEN) {
          const raw = localStorage.getItem(LOCAL_PROFILE_KEY);
          const local = raw ? (JSON.parse(raw) as Partial<ProfessionalProfile>) : undefined;
          const normalized = normalizeProfile(local, user);
          if (!cancelled) {
            setProfile(normalized);
            setOpen(!computeCompletion(normalized).complete);
          }
          return;
        }

        const response = await fetch("/api/auth/professional-profile", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json", ...authHeaders() },
        });
        const result = await readJson<ProfileResponse>(response);
        if (!response.ok || !result?.success || !result.profile) {
          throw new Error(result?.message || "دریافت پروفایل حرفه‌ای انجام نشد.");
        }

        const normalized = normalizeProfile(result.profile, user);
        if (!cancelled) {
          setProfile(normalized);
          setOpen(!Boolean(result.profile.profile_complete));
        }
      } catch (loadError) {
        if (!cancelled) {
          setProfile(emptyProfile(user));
          setOpen(true);
          setError(loadError instanceof Error ? loadError.message : "دریافت پروفایل حرفه‌ای انجام نشد.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [professional, user]);

  useEffect(() => {
    if (!professional) return;
    let cancelled = false;
    setGeoLoading(true);
    fetchGeo()
      .then((items) => {
        if (!cancelled) setProvinces(items);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setGeoError(reason instanceof Error ? reason.message : "دریافت استان‌ها انجام نشد.");
      })
      .finally(() => {
        if (!cancelled) setGeoLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [professional]);

  useEffect(() => {
    if (!profile.province) {
      setCities([]);
      return;
    }

    let cancelled = false;
    setGeoLoading(true);
    fetchGeo({ province: profile.province })
      .then((items) => {
        if (!cancelled) setCities(items);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setGeoError(reason instanceof Error ? reason.message : "دریافت شهرها انجام نشد.");
      })
      .finally(() => {
        if (!cancelled) setGeoLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profile.province]);

  useEffect(() => {
    if (!profile.province || !profile.city) {
      setNeighborhoods([]);
      return;
    }

    let cancelled = false;
    setGeoLoading(true);
    fetchGeo({ province: profile.province, city: profile.city })
      .then((items) => {
        if (!cancelled) setNeighborhoods(items);
      })
      .catch(() => {
        if (!cancelled) setNeighborhoods([]);
      })
      .finally(() => {
        if (!cancelled) setGeoLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profile.city, profile.province]);

  if (!professional) return null;

  function updateField<K extends keyof ProfessionalProfile>(key: K, value: ProfessionalProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
    setError("");
    setMessage("");
  }

  function addService() {
    const value = serviceInput.trim().replace(/\s+/g, " ");
    if (!value) return;
    if (profile.services.some((item) => item.toLocaleLowerCase("fa") === value.toLocaleLowerCase("fa"))) {
      setServiceInput("");
      return;
    }
    if (profile.services.length >= 20) {
      setError("حداکثر ۲۰ خدمت قابل ثبت است.");
      return;
    }
    updateField("services", [...profile.services, value]);
    setServiceInput("");
  }


  function toggleCategory(key: string) {
    const selected = profile.service_categories.includes(key);
    updateField(
      "service_categories",
      selected
        ? profile.service_categories.filter((item) => item !== key)
        : [...profile.service_categories, key].slice(0, 20),
    );
  }

  async function uploadImage(kind: "logo" | "cover" | "gallery", file?: File) {
    if (!file || uploading) return;
    if (!file.type.startsWith("image/")) {
      setError("فایل انتخاب‌شده تصویر نیست.");
      return;
    }

    setUploading(kind);
    setError("");
    setMessage("");

    try {
      let url = "";
      if (IS_LOCAL_DEV && getToken() === LOCAL_DEV_SESSION_TOKEN) {
        url = await fileToDataUrl(file);
      } else {
        const body = new FormData();
        body.set("kind", kind);
        body.set("file", file);

        const response = await fetch("/api/auth/professional-profile/upload", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          headers: authHeaders(),
          body,
        });
        const result = await readJson<UploadResponse>(response);
        if (!response.ok || !result?.success || !result.url) {
          throw new Error(result?.message || "بارگذاری تصویر انجام نشد.");
        }
        url = result.url;
      }

      if (kind === "logo") updateField("logo_url", url);
      if (kind === "cover") updateField("cover_url", url);
      if (kind === "gallery") {
        if (profile.gallery.length >= 8) throw new Error("حداکثر ۸ تصویر در گالری قابل ثبت است.");
        updateField("gallery", [...profile.gallery, url]);
      }
      setMessage("تصویر آماده ذخیره است.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "بارگذاری تصویر انجام نشد.");
    } finally {
      setUploading("");
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError("مرورگر شما دریافت موقعیت فعلی را پشتیبانی نمی‌کند.");
      return;
    }

    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setProfile((current) => ({
          ...current,
          latitude: Number(position.coords.latitude.toFixed(7)),
          longitude: Number(position.coords.longitude.toFixed(7)),
        }));
        setLocating(false);
      },
      () => {
        setError("دسترسی موقعیت مکانی داده نشد یا موقعیت قابل دریافت نبود.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    if (profile.name.trim().length < 2) {
      setError("نام مجموعه را کامل‌تر وارد کنید.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const cleanProfile: ProfessionalProfile = {
      ...profile,
      business_type: businessTypeFromUser(user),
      name: profile.name.trim().replace(/\s+/g, " "),
      phone: profile.phone.trim(),
      whatsapp_phone: profile.whatsapp_phone.trim(),
      email: profile.email.trim(),
      website_url: profile.website_url.trim(),
      instagram_url: profile.instagram_url.trim(),
      province: profile.province.trim(),
      city: profile.city.trim(),
      neighborhood: profile.neighborhood.trim(),
      address: profile.address.trim(),
      description: profile.description.trim(),
      services: cleanList(profile.services, 20),
      service_categories: cleanList(profile.service_categories, 20).filter((key) =>
        CATEGORY_CATALOG[businessTypeFromUser(user)].some((item) => item.key === key),
      ),
      mobile_service: Boolean(profile.mobile_service),
      price_range_text: profile.price_range_text.trim(),
      gallery: cleanList(profile.gallery, 8),
      business_hours: normalizeHours(profile.business_hours),
    };

    try {
      if (IS_LOCAL_DEV && getToken() === LOCAL_DEV_SESSION_TOKEN) {
        const localCompletion = computeCompletion(cleanProfile);
        const nextProfile: ProfessionalProfile = {
          ...cleanProfile,
          profile_complete: localCompletion.complete,
          profile_status: localCompletion.complete ? "complete" : "draft",
          completion_percent: localCompletion.percent,
          completion_checks: localCompletion.checks,
          moderation_status: "pending",
          home_featured: false,
        };
        try {
          localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(nextProfile));
        } catch {
          // پیش‌نمایش تصاویر بزرگ ممکن است از ظرفیت localStorage بیشتر باشد.
        }
        setProfile(nextProfile);
        setMessage(
          localCompletion.complete
            ? "پروفایل حرفه‌ای مجموعه تکمیل شد."
            : "اطلاعات به‌صورت پیش‌نویس ذخیره شد؛ موارد ضروری باقی‌مانده را تکمیل کنید.",
        );
        if (localCompletion.complete) setOpen(false);
        return;
      }

      const response = await fetch("/api/auth/professional-profile", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify(cleanProfile),
      });
      const result = await readJson<ProfileResponse>(response);
      if (!response.ok || !result?.success || !result.profile) {
        throw new Error(result?.message || "ذخیره پروفایل حرفه‌ای انجام نشد.");
      }

      const normalized = normalizeProfile(result.profile, result.user || user);
      setProfile(normalized);
      setMessage(result.message || "پروفایل حرفه‌ای ذخیره شد.");
      if (result.user) {
        localStorage.setItem("chakod_user", JSON.stringify(result.user));
        window.dispatchEvent(new Event("chakod:auth-changed"));
        onUserUpdated?.(result.user);
      }
      if (result.profile.profile_complete) setOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "ذخیره پروفایل حرفه‌ای انجام نشد.");
    } finally {
      setSaving(false);
    }
  }

  const hasMap = profile.latitude !== null && profile.longitude !== null;
  const mapUrl = hasMap
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${profile.longitude! - 0.01}%2C${profile.latitude! - 0.008}%2C${profile.longitude! + 0.01}%2C${profile.latitude! + 0.008}&layer=mapnik&marker=${profile.latitude}%2C${profile.longitude}`
    : "";

  return (
    <section id="professional-profile" className={styles.panel} aria-labelledby="professional-profile-title">
      <div className={styles.summary}>
        <div className={styles.summaryCopy}>
          <span className={styles.eyebrow}>پروفایل حرفه‌ای {typeTitle(profile.business_type)}</span>
          <h2 id="professional-profile-title">مشخصات عمومی مجموعه</h2>
          <p>اطلاعاتی که در صفحه عمومی مجموعه و آگهی‌های حرفه‌ای نمایش داده می‌شود.</p>
        </div>

        <div className={styles.summaryActions}>
          <div className={styles.progressBadge} title="درصد تکمیل پروفایل">
            <span>{loading ? "…" : `${completion.percent.toLocaleString("fa-IR")}٪`}</span>
            <small>{completion.complete ? "آماده انتشار" : "در حال تکمیل"}</small>
          </div>
          <button
            type="button"
            className={styles.toggleButton}
            onClick={() => {
              setOpen((value) => !value);
              setError("");
            }}
            disabled={loading}
          >
            {open ? "بستن" : completion.complete ? "ویرایش پروفایل" : "تکمیل پروفایل"}
          </button>
        </div>
      </div>

      <div className={styles.progressTrack} aria-hidden="true">
        <span style={{ width: `${completion.percent}%` }} />
      </div>

      {!loading && completion.complete && (
        <div
          className={`${styles.moderationNotice} ${
            profile.moderation_status === "approved"
              ? styles.moderationApproved
              : profile.moderation_status === "rejected" || profile.moderation_status === "suspended"
                ? styles.moderationRejected
                : styles.moderationPending
          }`}
        >
          <strong>
            {profile.moderation_status === "approved"
              ? "صفحه عمومی کسب‌وکار تأیید و منتشر شده است."
              : profile.moderation_status === "rejected"
                ? "پروفایل توسط مدیریت رد شده است."
                : profile.moderation_status === "suspended"
                  ? "صفحه عمومی کسب‌وکار تعلیق شده است."
                  : "پروفایل برای بررسی مدیریت ارسال شده است."}
          </strong>
          {profile.moderation_note && <span>{profile.moderation_note}</span>}
          {profile.moderation_status === "approved" && profile.public_slug && (
            <a href={`/businesses/${profile.public_slug}`}>مشاهده صفحه عمومی کسب‌وکار</a>
          )}
        </div>
      )}

      {loading && <div className={styles.state}>در حال دریافت پروفایل حرفه‌ای…</div>}

      {!loading && open && (
        <form className={styles.form} onSubmit={saveProfile}>
          <section className={styles.formSection}>
            <header><span>۱</span><div><h3>هویت بصری مجموعه</h3><p>لوگو، تصویر اصلی و معرفی کوتاه مجموعه</p></div></header>

            <div className={styles.mediaRow}>
              <label className={styles.logoUploader}>
                {profile.logo_url ? <img src={profile.logo_url} alt="لوگوی مجموعه" /> : <b>لوگو</b>}
                <span>{uploading === "logo" ? "در حال بارگذاری…" : "انتخاب لوگو"}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => void uploadImage("logo", event.target.files?.[0])}
                />
              </label>

              <label className={styles.coverUploader}>
                {profile.cover_url ? <img src={profile.cover_url} alt="تصویر کاور مجموعه" /> : <b>تصویر کاور مجموعه</b>}
                <span>{uploading === "cover" ? "در حال بارگذاری…" : "انتخاب کاور"}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => void uploadImage("cover", event.target.files?.[0])}
                />
              </label>
            </div>

            <div className={styles.twoColumns}>
              <label className={styles.field}>
                <span>نام عمومی مجموعه <em>ضروری</em></span>
                <input
                  value={profile.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  maxLength={180}
                  autoComplete="organization"
                  required
                />
              </label>
              <label className={styles.field}>
                <span>نوع فعالیت</span>
                <input value={typeTitle(profile.business_type)} readOnly />
              </label>
            </div>

            <label className={styles.field}>
              <span>معرفی مجموعه</span>
              <textarea
                value={profile.description}
                onChange={(event) => updateField("description", event.target.value)}
                maxLength={3000}
                rows={4}
                placeholder="سابقه، تخصص، مزیت‌ها و خدمات اصلی مجموعه را معرفی کنید."
              />
            </label>
          </section>

          <section className={styles.formSection}>
            <header><span>۲</span><div><h3>راه‌های ارتباطی</h3><p>اطلاعات تماس عمومی؛ شماره ورود شما نمایش داده نمی‌شود</p></div></header>
            <div className={styles.twoColumns}>
              <label className={styles.field}>
                <span>شماره تماس عمومی <em>ضروری</em></span>
                <input
                  value={profile.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                  inputMode="tel"
                  maxLength={20}
                  placeholder="مثلاً ۰۱۳۳۲۲۲۲۲۲۲"
                />
              </label>
              <label className={styles.field}>
                <span>شماره واتساپ</span>
                <input
                  value={profile.whatsapp_phone}
                  onChange={(event) => updateField("whatsapp_phone", event.target.value)}
                  inputMode="tel"
                  maxLength={20}
                  placeholder="مثلاً ۰۹۱۱۱۲۳۴۵۶۷"
                />
              </label>
              <label className={styles.field}>
                <span>ایمیل</span>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  maxLength={190}
                  placeholder="info@example.com"
                />
              </label>
              <label className={styles.field}>
                <span>وب‌سایت</span>
                <input
                  value={profile.website_url}
                  onChange={(event) => updateField("website_url", event.target.value)}
                  maxLength={500}
                  placeholder="example.com"
                  dir="ltr"
                />
              </label>
              <label className={styles.field}>
                <span>اینستاگرام</span>
                <input
                  value={profile.instagram_url}
                  onChange={(event) => updateField("instagram_url", event.target.value)}
                  maxLength={255}
                  placeholder="instagram.com/username"
                  dir="ltr"
                />
              </label>
            </div>
          </section>

          <section className={styles.formSection}>
            <header><span>۳</span><div><h3>آدرس و موقعیت نقشه</h3><p>نشانی اصلی مجموعه را دقیق ثبت کنید</p></div></header>

            <div className={styles.threeColumns}>
              <label className={styles.field}>
                <span>استان <em>ضروری</em></span>
                <select
                  value={profile.province}
                  onChange={(event) => {
                    setCities([]);
                    setNeighborhoods([]);
                    setProfile((current) => ({
                      ...current,
                      province: event.target.value,
                      city: "",
                      neighborhood: "",
                    }));
                    setGeoError("");
                  }}
                >
                  <option value="">انتخاب استان</option>
                  {profile.province && !provinces.includes(profile.province) && (
                    <option value={profile.province}>{profile.province}</option>
                  )}
                  {provinces.map((province) => <option key={province} value={province}>{province}</option>)}
                </select>
              </label>

              <label className={styles.field}>
                <span>شهر <em>ضروری</em></span>
                <select
                  value={profile.city}
                  disabled={!profile.province}
                  onChange={(event) => {
                    setNeighborhoods([]);
                    setProfile((current) => ({ ...current, city: event.target.value, neighborhood: "" }));
                  }}
                >
                  <option value="">انتخاب شهر</option>
                  {profile.city && !cities.includes(profile.city) && <option value={profile.city}>{profile.city}</option>}
                  {cities.map((city) => <option key={city} value={city}>{city}</option>)}
                </select>
              </label>

              <label className={styles.field}>
                <span>محله</span>
                <select
                  value={profile.neighborhood}
                  disabled={!profile.city}
                  onChange={(event) => updateField("neighborhood", event.target.value)}
                >
                  <option value="">بدون انتخاب محله</option>
                  {profile.neighborhood && !neighborhoods.includes(profile.neighborhood) && (
                    <option value={profile.neighborhood}>{profile.neighborhood}</option>
                  )}
                  {neighborhoods.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
            </div>

            {geoLoading && <small className={styles.help}>در حال دریافت فهرست موقعیت…</small>}
            {geoError && <small className={styles.geoError}>{geoError}</small>}

            <label className={styles.field}>
              <span>آدرس دقیق <em>ضروری</em></span>
              <textarea
                value={profile.address}
                onChange={(event) => updateField("address", event.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="خیابان، کوچه، پلاک و نشانه نزدیک را وارد کنید."
              />
            </label>

            <div className={styles.mapGrid}>
              <div className={styles.coordinatePanel}>
                <div className={styles.twoColumns}>
                  <label className={styles.field}>
                    <span>عرض جغرافیایی</span>
                    <input
                      type="number"
                      step="0.0000001"
                      min="-90"
                      max="90"
                      value={profile.latitude ?? ""}
                      onChange={(event) => updateField("latitude", event.target.value === "" ? null : Number(event.target.value))}
                      dir="ltr"
                    />
                  </label>
                  <label className={styles.field}>
                    <span>طول جغرافیایی</span>
                    <input
                      type="number"
                      step="0.0000001"
                      min="-180"
                      max="180"
                      value={profile.longitude ?? ""}
                      onChange={(event) => updateField("longitude", event.target.value === "" ? null : Number(event.target.value))}
                      dir="ltr"
                    />
                  </label>
                </div>
                <button type="button" className={styles.locationButton} onClick={useCurrentLocation} disabled={locating}>
                  {locating ? "در حال دریافت موقعیت…" : "استفاده از موقعیت فعلی دستگاه"}
                </button>
                <small>مختصات را می‌توانید از نقشه تلفن همراه یا دستگاه فعلی دریافت کنید.</small>
              </div>

              <div className={styles.mapPreview}>
                {hasMap ? (
                  <iframe title="موقعیت مجموعه روی نقشه" src={mapUrl} loading="lazy" />
                ) : (
                  <div><b>پیش‌نمایش نقشه</b><span>پس از ثبت مختصات نمایش داده می‌شود.</span></div>
                )}
              </div>
            </div>
          </section>

          <section className={styles.formSection}>
            <header><span>۴</span><div><h3>زمینه فعالیت و خدمات</h3><p>دسته‌های اصلی را انتخاب و خدمات اختصاصی را اضافه کنید</p></div></header>

            <div className={styles.categoryPicker}>
              <strong>زمینه‌های فعالیت <em>ضروری</em></strong>
              <div className={styles.categoryGrid}>
                {CATEGORY_CATALOG[profile.business_type].map((item) => {
                  const selected = profile.service_categories.includes(item.key);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      className={selected ? styles.categorySelected : ""}
                      aria-pressed={selected}
                      onClick={() => toggleCategory(item.key)}
                    >
                      <span>{selected ? "✓" : "+"}</span>
                      {item.label}
                    </button>
                  );
                })}
              </div>
              {profile.service_categories.length > 0 && (
                <small>
                  انتخاب‌شده: {profile.service_categories.map((key) => categoryLabel(profile.business_type, key)).join("، ")}
                </small>
              )}
            </div>

            <div className={styles.twoColumns}>
              <label className={styles.field}>
                <span>محدوده تقریبی قیمت</span>
                <input
                  value={profile.price_range_text}
                  onChange={(event) => updateField("price_range_text", event.target.value)}
                  maxLength={180}
                  placeholder="مثلاً پس از بازدید، یا از ۵۰۰ هزار تومان"
                />
              </label>

              <label className={styles.checkField}>
                <input
                  type="checkbox"
                  checked={profile.mobile_service}
                  onChange={(event) => updateField("mobile_service", event.target.checked)}
                />
                <span><strong>خدمات در محل ارائه می‌شود</strong><small>برای خدمات سیار، امداد، کارواش یا کارشناسی در محل</small></span>
              </label>
            </div>

            <div className={styles.customServices}>
              <strong>خدمات اختصاصی یا برندهای تحت پوشش</strong>
              <div className={styles.serviceInputRow}>
                <input
                  value={serviceInput}
                  onChange={(event) => setServiceInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addService();
                    }
                  }}
                  maxLength={80}
                  placeholder={
                    profile.business_type === "dealer"
                      ? "مثلاً فروش خودروهای وارداتی"
                      : profile.business_type === "parts_store"
                        ? "مثلاً قطعات جلوبندی هیوندای و کیا"
                        : profile.business_type === "car_service"
                          ? "مثلاً شیشه دودی با ضمانت یا سرامیک ۹H"
                          : "مثلاً تعمیر تخصصی موتور و گیربکس"
                  }
                />
                <button type="button" onClick={addService}>افزودن</button>
              </div>
              <div className={styles.chips}>
                {profile.services.length === 0 && <span className={styles.emptyChip}>هنوز توضیح اختصاصی ثبت نشده است.</span>}
                {profile.services.map((service) => (
                  <button
                    key={service}
                    type="button"
                    onClick={() => updateField("services", profile.services.filter((item) => item !== service))}
                    title="حذف خدمت"
                  >
                    {service}<b>×</b>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className={styles.formSection}>
            <header><span>۵</span><div><h3>ساعات کاری</h3><p>روزهای فعال و ساعت پاسخ‌گویی را مشخص کنید</p></div></header>
            <div className={styles.hoursGrid}>
              {profile.business_hours.map((row, index) => (
                <div className={`${styles.hourRow} ${row.enabled ? styles.hourEnabled : ""}`} key={row.day}>
                  <label className={styles.dayToggle}>
                    <input
                      type="checkbox"
                      checked={row.enabled}
                      onChange={(event) => {
                        const next = [...profile.business_hours];
                        next[index] = { ...row, enabled: event.target.checked };
                        updateField("business_hours", next);
                      }}
                    />
                    <strong>{row.day}</strong>
                  </label>
                  <input
                    type="time"
                    value={row.open}
                    disabled={!row.enabled}
                    onChange={(event) => {
                      const next = [...profile.business_hours];
                      next[index] = { ...row, open: event.target.value };
                      updateField("business_hours", next);
                    }}
                  />
                  <span>تا</span>
                  <input
                    type="time"
                    value={row.close}
                    disabled={!row.enabled}
                    onChange={(event) => {
                      const next = [...profile.business_hours];
                      next[index] = { ...row, close: event.target.value };
                      updateField("business_hours", next);
                    }}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className={styles.formSection}>
            <header><span>۶</span><div><h3>گالری مجموعه</h3><p>حداکثر ۸ تصویر از محیط، تیم یا نمونه خدمات</p></div></header>
            <div className={styles.galleryGrid}>
              {profile.gallery.map((image) => (
                <figure key={image}>
                  <img src={image} alt="تصویر مجموعه" />
                  <button type="button" onClick={() => updateField("gallery", profile.gallery.filter((item) => item !== image))}>حذف</button>
                </figure>
              ))}
              {profile.gallery.length < 8 && (
                <label className={styles.galleryUploader}>
                  <b>＋</b>
                  <span>{uploading === "gallery" ? "در حال بارگذاری…" : "افزودن تصویر"}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event: ChangeEvent<HTMLInputElement>) => void uploadImage("gallery", event.target.files?.[0])}
                  />
                </label>
              )}
            </div>
          </section>

          <aside className={styles.requiredBox}>
            <strong>موارد ضروری برای آماده انتشار شدن</strong>
            <div>
              <span className={completion.checks.name ? styles.done : ""}>نام مجموعه</span>
              <span className={completion.checks.phone ? styles.done : ""}>تلفن عمومی</span>
              <span className={completion.checks.location ? styles.done : ""}>استان و شهر</span>
              <span className={completion.checks.address ? styles.done : ""}>آدرس دقیق</span>
              <span className={completion.checks.services ? styles.done : ""}>حداقل یک زمینه فعالیت</span>
            </div>
          </aside>

          {error && <div className={styles.error}>{error}</div>}
          {message && <div className={styles.success}>{message}</div>}

          <div className={styles.formActions}>
            <button type="submit" disabled={saving || Boolean(uploading)}>
              {saving ? "در حال ذخیره…" : completion.complete ? "ذخیره تغییرات" : "ذخیره پیش‌نویس"}
            </button>
            <small>اطلاعات ناقص نیز ذخیره می‌شود و بعداً قابل تکمیل است.</small>
          </div>
        </form>
      )}

      {!loading && !open && message && <div className={styles.success}>{message}</div>}
      {!loading && !open && !completion.complete && (
        <div className={styles.compactNotice}>پروفایل حرفه‌ای هنوز آماده انتشار نیست. موارد ضروری را تکمیل کنید.</div>
      )}
    </section>
  );
}
