"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import PersianDatePicker, { formatPersianDate } from "../../components/PersianDatePicker";
import styles from "./CommerceAdminClient.module.css";

type Capabilities = {
  pricing_view: boolean;
  pricing_manage: boolean;
  orders_view: boolean;
  orders_manage: boolean;
  subscriptions_view: boolean;
  subscriptions_manage: boolean;
  discounts_view: boolean;
  discounts_manage: boolean;
  financial_reports: boolean;
  admins_view: boolean;
  admins_manage: boolean;
  sensitive_finance: boolean;
  audit_view: boolean;
};

type Service = {
  service_key: string;
  title: string;
  audience: string;
  amount_toman: number;
  duration_value: number;
  duration_unit: string;
  is_active: boolean;
  settings: Record<string, unknown>;
  updated_at?: string;
};

type Province = {
  province: string;
  is_large: boolean;
  story_price_toman: number;
  story_duration_hours: number;
  story_is_active: boolean;
};

type DiscountCode = {
  id: number;
  code: string;
  title: string;
  description?: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  max_discount_toman?: number | null;
  min_order_toman: number;
  starts_at?: string | null;
  expires_at?: string | null;
  usage_limit_total?: number | null;
  usage_limit_per_user?: number | null;
  allowed_services: string[];
  allowed_audiences: string[];
  allowed_provinces: string[];
  allowed_mobiles: string[];
  first_purchase_only: boolean;
  is_stackable: boolean;
  is_active: boolean;
  used_count: number;
  unique_users: number;
  total_discount_toman: number;
  created_at?: string;
  updated_at?: string;
};

type Order = {
  id: number;
  order_no: string;
  service_key: string;
  full_name?: string | null;
  mobile: string;
  dealer_name?: string | null;
  province?: string | null;
  total_amount_toman: number;
  original_amount_toman?: number | null;
  discount_amount_toman?: number | null;
  discount_code?: string | null;
  status: string;
  provider?: string | null;
  ref_id?: string | null;
  created_at: string;
  paid_at?: string | null;
};



type Subscription = {
  id: number;
  dealer_id: number;
  service_key: string;
  dealer_name: string;
  business_type?: string | null;
  mobile?: string | null;
  full_name?: string | null;
  status: string;
  starts_at?: string | null;
  expires_at?: string | null;
  created_at: string;
};

type AdminUser = {
  id: number;
  auth_user_id?: number | null;
  mobile?: string | null;
  invited_mobile?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  role: string;
  status: string;
  permissions: string[];
  can_view_sensitive_finance: boolean;
};

type Audit = {
  id: number;
  display_name?: string | null;
  action_key: string;
  entity_type?: string | null;
  entity_id?: string | null;
  ip_address?: string | null;
  created_at: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
};

type AdminResponse = {
  success?: boolean;
  message?: string;
  capabilities?: Capabilities;
  summary?: {
    pending_orders: number | null;
    paid_orders_30d: number | null;
    revenue_30d: number | null;
    active_subscriptions: number | null;
  };
  services?: Service[];
  provinces?: Province[];
  discounts?: DiscountCode[];
  orders?: Order[];
  subscriptions?: Subscription[];
  admins?: AdminUser[];
  audit?: Audit[];
  revenue_daily?: { date: string; amount_toman: number; orders_count: number }[];
  revenue_by_service?: { service_key: string; title: string; amount_toman: number; orders_count: number }[];
  recent_orders?: Order[];
  warnings?: string[];
};

type Tab = "overview" | "pricing" | "provinces" | "discounts" | "orders" | "subscriptions" | "admins" | "audit";

const adminPermissions = [
  ["pricing.view", "مشاهده قیمت‌ها"],
  ["pricing.manage", "تغییر قیمت‌ها"],
  ["orders.view", "مشاهده سفارش‌ها"],
  ["orders.manage", "مدیریت سفارش‌ها"],
  ["payments.view", "مشاهده پرداخت‌ها"],
  ["payments.manage", "اصلاح و بازگشت پرداخت"],
  ["subscriptions.view", "مشاهده اشتراک‌ها"],
  ["subscriptions.manage", "مدیریت اشتراک‌ها"],
  ["discounts.view", "مشاهده کدهای تخفیف"],
  ["discounts.manage", "مدیریت کدهای تخفیف"],
  ["admins.view", "مشاهده مدیران"],
  ["admins.manage", "مدیریت دسترسی مدیران"],
  ["audit.view", "مشاهده گزارش تغییرات"],
  ["reports.financial.view", "گزارش مالی"],
] as const;

const statusLabels: Record<string, string> = {
  pending_payment: "در انتظار پرداخت",
  paid: "پرداخت‌شده",
  failed: "ناموفق",
  cancelled: "لغوشده",
  refunded: "بازگشت وجه",
  pending_review: "در انتظار بررسی",
  scheduled: "زمان‌بندی‌شده",
  active: "فعال",
  rejected: "ردشده",
  expired: "منقضی",
};

const capabilityLabels: Record<keyof Capabilities, string> = {
  pricing_view: "مشاهده تعرفه‌ها",
  pricing_manage: "مدیریت تعرفه‌ها",
  orders_view: "مشاهده سفارش‌ها",
  orders_manage: "مدیریت سفارش‌ها",
  subscriptions_view: "مشاهده اشتراک‌ها",
  subscriptions_manage: "مدیریت اشتراک‌ها",
  discounts_view: "مشاهده کدهای تخفیف",
  discounts_manage: "مدیریت کدهای تخفیف",
  financial_reports: "مشاهده گزارش مالی",
  admins_view: "مشاهده مدیران",
  admins_manage: "مدیریت مدیران",
  sensitive_finance: "مشاهده اطلاعات مالی محرمانه",
  audit_view: "مشاهده گزارش تغییرات",
};

const tabIcons: Record<Tab, string> = {
  overview: "⌂",
  pricing: "₮",
  provinces: "⌖",
  discounts: "%",
  orders: "▣",
  subscriptions: "◫",
  admins: "♙",
  audit: "≡",
};

const serviceGroupDefinitions = [
  { key: "listing", title: "آگهی خودرو", description: "انتشار، تمدید و بالابر آگهی‌ها", match: (key: string) => key.startsWith("listing_personal") || key.startsWith("listing_dealer") || key === "listing_bump" },
  { key: "professional", title: "پروفایل حرفه‌ای", description: "اشتراک نمایشگاه، تعمیرگاه و فروشگاه یدکی", match: (key: string) => key.startsWith("professional_profile") },
  { key: "story", title: "استوری استانی", description: "تبلیغ ۲۴ ساعته بر اساس گروه استان", match: (key: string) => key.startsWith("listing_story") },
] as const;

type DiscountStep = 1 | 2 | 3;
type ServiceGroup = { key: string; title: string; description: string; services: Service[] };

const auditActionLabels: Record<string, string> = {
  update_service: "تغییر تعرفه خدمت",
  update_province: "تغییر قیمت یا ظرفیت استان",
  update_order_status: "تغییر وضعیت سفارش",
  update_subscription: "ویرایش اشتراک",
  create_admin: "افزودن مدیر",
  update_admin_access: "تغییر دسترسی مدیر",
  "discount.create": "ساخت کد تخفیف",
  "discount.update": "ویرایش کد تخفیف",
};

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

const DIRECT_ADMIN_COMMERCE_URL =
  "https://api.chakod.com/api/admin-commerce.php";

async function fetchAdminCommerce(options: RequestInit = {}, section = "overview"): Promise<Response> {
  const isLocalhost =
    typeof window !== "undefined" &&
    (window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "localhost");

  const query = `?section=${encodeURIComponent(section)}`;
  const endpoints = isLocalhost
    ? [`${DIRECT_ADMIN_COMMERCE_URL}${query}`, `/api/admin/commerce${query}`]
    : [`/api/admin/commerce${query}`, `${DIRECT_ADMIN_COMMERCE_URL}${query}`];

  let lastError: unknown = null;

  for (const endpoint of endpoints) {
    const isDirect = endpoint.startsWith("https://");

    try {
      const response = await fetch(endpoint, {
        ...options,
        cache: "no-store",
        credentials: isDirect ? "omit" : "include",
        mode: isDirect ? "cors" : "same-origin",
        headers: {
          Accept: "application/json",
          ...authHeaders(),
          ...(options.headers || {}),
        },
      });

      if (!isDirect && response.status === 502) {
        const payload = await response
          .clone()
          .json()
          .catch(() => null) as { message?: string } | null;

        if (
          payload?.message?.includes("ارتباط با سرویس حساب کاربری برقرار نشد")
        ) {
          lastError = new Error(payload.message);
          continue;
        }
      }

      return response;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("ارتباط با API چاکود برقرار نشد.");
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("پاسخ سرور معتبر نیست.");
  }
}

function formatToman(value?: number | null) {
  return `${new Intl.NumberFormat("fa-IR").format(Number(value || 0))} تومان`;
}

function formatNumber(value?: number | null) {
  return new Intl.NumberFormat("fa-IR").format(Number(value || 0));
}

function formatCompactToman(value?: number | null) {
  const amount = Number(value || 0);
  if (amount >= 1_000_000_000) return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(amount / 1_000_000_000)} میلیارد`;
  if (amount >= 1_000_000) return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(amount / 1_000_000)} میلیون`;
  if (amount >= 1_000) return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }).format(amount / 1_000)} هزار`;
  return formatNumber(amount);
}

const serviceAudienceLabels: Record<string, string> = {
  personal: "کاربر شخصی",
  dealer: "نمایشگاه",
  professional: "پروفایل حرفه‌ای",
  all: "همه کاربران",
};

function formatDuration(service: Service) {
  if (!service.duration_value || service.duration_unit === "none") return "بدون مدت";
  const units: Record<string, string> = { hour: "ساعت", day: "روز", month: "ماه" };
  return `${formatNumber(service.duration_value)} ${units[service.duration_unit] || service.duration_unit}`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function maskMobile(value?: string | null) {
  if (!value || value.length < 8) return value || "—";
  return `${value.slice(0, 4)}****${value.slice(-3)}`;
}

export default function CommerceAdminClient() {
  const [data, setData] = useState<AdminResponse | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [sectionLoading, setSectionLoading] = useState("");
  const [loadedSections, setLoadedSections] = useState<string[]>([]);
  const [workingKey, setWorkingKey] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [serviceDrafts, setServiceDrafts] = useState<Record<string, Service>>({});
  const [provinceDrafts, setProvinceDrafts] = useState<Record<string, Province>>({});
  const [discountDrafts, setDiscountDrafts] = useState<Record<number, DiscountCode>>({});
  const [adminDrafts, setAdminDrafts] = useState<Record<number, AdminUser>>({});
  const [subscriptionDrafts, setSubscriptionDrafts] = useState<Record<number, Subscription>>({});
  const [provinceSearch, setProvinceSearch] = useState("");
  const [discountSearch, setDiscountSearch] = useState("");
  const [discountCreatorOpen, setDiscountCreatorOpen] = useState(false);
  const [editingDiscountId, setEditingDiscountId] = useState<number | null>(null);
  const [discountStep, setDiscountStep] = useState<DiscountStep>(1);
  const [newDiscountGeoMode, setNewDiscountGeoMode] = useState<"all" | "selected">("all");
  const [discountProvinceSearch, setDiscountProvinceSearch] = useState("");
  const [managerCreatorOpen, setManagerCreatorOpen] = useState(false);
  const [provinceClassFilter, setProvinceClassFilter] = useState<"all" | "regular" | "large">("all");
  const [orderSearch, setOrderSearch] = useState("");
  const emptyDiscount: Omit<DiscountCode, "id" | "used_count" | "unique_users" | "total_discount_toman"> = {
    code: "",
    title: "",
    description: "",
    discount_type: "percent",
    discount_value: 10,
    max_discount_toman: null,
    min_order_toman: 0,
    starts_at: "",
    expires_at: "",
    usage_limit_total: null,
    usage_limit_per_user: 1,
    allowed_services: [],
    allowed_audiences: [],
    allowed_provinces: [],
    allowed_mobiles: [],
    first_purchase_only: false,
    is_stackable: false,
    is_active: true,
  };
  const [newDiscount, setNewDiscount] = useState({ ...emptyDiscount });
  const [newAdmin, setNewAdmin] = useState({
    mobile: "",
    display_name: "",
    role: "viewer",
    permissions: [] as string[],
    can_view_sensitive_finance: false,
  });

  async function load(section: string = "overview", reset = false) {
    if (reset) {
      setLoading(true);
      setData(null);
      setLoadedSections([]);
    } else {
      setSectionLoading(section);
    }
    setError("");

    const token = getToken();
    if (!token) {
      setError("نشست ورود پیدا نشد. ابتدا با حساب مدیر وارد شوید.");
      setLoading(false);
      setSectionLoading("");
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 25_000);

    try {
      const response = await fetchAdminCommerce({
        method: "GET",
        signal: controller.signal,
      }, section);
      const payload = await readJson<AdminResponse>(response);
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || `اطلاعات مدیریت دریافت نشد. کد ${response.status}`);
      }

      setData((current) => ({
        ...(current || {}),
        ...payload,
        capabilities: payload.capabilities || current?.capabilities,
        summary: payload.summary || current?.summary,
        services: (payload.services ?? current?.services ?? []).filter((item) => !item.service_key.startsWith("home_banner")),
        provinces: payload.provinces ?? current?.provinces,
        discounts: payload.discounts ?? current?.discounts,
        orders: payload.orders ?? current?.orders,
        subscriptions: payload.subscriptions ?? current?.subscriptions,
        admins: payload.admins ?? current?.admins,
        audit: payload.audit ?? current?.audit,
        revenue_daily: payload.revenue_daily ?? current?.revenue_daily,
        revenue_by_service: payload.revenue_by_service ?? current?.revenue_by_service,
        recent_orders: payload.recent_orders ?? current?.recent_orders,
        warnings: payload.warnings || [],
      }));

      if (payload.services) setServiceDrafts(Object.fromEntries(payload.services.map((item) => [item.service_key, { ...item, settings: { ...(item.settings || {}) } }])));
      if (payload.provinces) setProvinceDrafts(Object.fromEntries(payload.provinces.map((item) => [item.province, { ...item }])));
      if (payload.discounts) setDiscountDrafts(Object.fromEntries(payload.discounts.map((item) => [item.id, { ...item, allowed_services: [...(item.allowed_services || [])], allowed_audiences: [...(item.allowed_audiences || [])], allowed_provinces: [...(item.allowed_provinces || [])], allowed_mobiles: [...(item.allowed_mobiles || [])] }])));
      if (payload.admins) setAdminDrafts(Object.fromEntries(payload.admins.map((item) => [item.id, { ...item, permissions: [...(item.permissions || [])] }])));
      if (payload.subscriptions) setSubscriptionDrafts(Object.fromEntries(payload.subscriptions.map((item) => [item.id, { ...item }])));
      setLoadedSections((current) => current.includes(section) ? current : [...current, section]);
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === "AbortError") {
        setError("دریافت این بخش طولانی شد. داده‌های آخرین بارگذاری نمایش داده می‌شود؛ دوباره تلاش کنید.");
      } else {
        setError(loadError instanceof Error ? loadError.message : "خطای ناشناخته");
      }
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
      setSectionLoading("");
    }
  }

  useEffect(() => {
    void load("overview", true);
  }, []);

  useEffect(() => {
    if (activeTab === "overview" || loadedSections.includes(activeTab) || loading) return;
    void load(activeTab);
  }, [activeTab, loadedSections, loading]);

  const caps = data?.capabilities;
  const tabs = useMemo(() => {
    const items: { key: Tab; label: string }[] = [{ key: "overview", label: "نمای کلی" }];
    if (caps?.pricing_view) items.push({ key: "pricing", label: "تعرفه خدمات" }, { key: "provinces", label: "قیمت استان‌ها" });
    if (caps?.discounts_view) items.push({ key: "discounts", label: "کدهای تخفیف" });
    if (caps?.orders_view) items.push({ key: "orders", label: "سفارش‌ها" });
    if (caps?.subscriptions_view) items.push({ key: "subscriptions", label: "اشتراک‌ها" });
    if (caps?.admins_view) items.push({ key: "admins", label: "مدیران و دسترسی" });
    if (caps?.audit_view) items.push({ key: "audit", label: "گزارش تغییرات" });
    return items;
  }, [caps]);

  const filteredProvinces = useMemo(() => {
    const search = provinceSearch.trim();
    return (data?.provinces || []).filter((item) => {
      const matchesSearch = !search || item.province.includes(search);
      const matchesClass = provinceClassFilter === "all" || (provinceClassFilter === "large" ? item.is_large : !item.is_large);
      return matchesSearch && matchesClass;
    });
  }, [data?.provinces, provinceSearch, provinceClassFilter]);

  const filteredDiscountProvinces = useMemo(() => {
    const search = discountProvinceSearch.trim();
    return (data?.provinces || []).filter((item) => !search || item.province.includes(search));
  }, [data?.provinces, discountProvinceSearch]);

  const filteredDiscounts = useMemo(() => {
    const search = discountSearch.trim().toLowerCase();
    return (data?.discounts || []).filter((item) => !search || [item.code, item.title, item.description].filter(Boolean).some((value) => String(value).toLowerCase().includes(search)));
  }, [data?.discounts, discountSearch]);

  const filteredOrders = useMemo(() => {
    const search = orderSearch.trim().toLowerCase();
    return (data?.orders || []).filter((item) => {
      if (!search) return true;
      return [item.order_no, item.service_key, item.mobile, item.dealer_name, item.province]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    });
  }, [data?.orders, orderSearch]);


  const serviceTitleByKey = useMemo(
    () => Object.fromEntries((data?.services || []).map((service) => [service.service_key, service.title])),
    [data?.services],
  );

  const enabledCapabilities = useMemo(
    () => Object.entries(caps || {}).filter(([key, value]) => key in capabilityLabels && Boolean(value)),
    [caps],
  );

  const hasFullAccess = Boolean(caps) && enabledCapabilities.length === Object.keys(capabilityLabels).length;

  const revenueSeries = useMemo(() => {
    const source = new Map<string, { date: string; amount_toman: number; orders_count: number }>((data?.revenue_daily || []).map((item) => [item.date, item]));
    const result: { date: string; amount_toman: number; orders_count: number }[] = [];
    const now = new Date();
    for (let offset = 29; offset >= 0; offset -= 1) {
      const day = new Date(now);
      day.setHours(12, 0, 0, 0);
      day.setDate(now.getDate() - offset);
      const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
      const item = source.get(key);
      result.push({ date: key, amount_toman: Number(item?.amount_toman || 0), orders_count: Number(item?.orders_count || 0) });
    }
    return result;
  }, [data?.revenue_daily]);

  const revenueMax = Math.max(1, ...revenueSeries.map((item) => item.amount_toman));
  const chartPoints = revenueSeries.map((item, index) => {
    const x = 24 + (index / Math.max(1, revenueSeries.length - 1)) * 852;
    const y = 210 - (item.amount_toman / revenueMax) * 164;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const chartAreaPoints = `24,210 ${chartPoints} 876,210`;
  const revenueChartHasData = revenueSeries.some((item) => item.amount_toman > 0);
  const revenueBreakdown = data?.revenue_by_service || [];
  const maxServiceRevenue = Math.max(1, ...revenueBreakdown.map((item) => item.amount_toman));
  const recentOrders = data?.recent_orders || [];
  const serviceGroups = useMemo<ServiceGroup[]>(() => {
    const source = data?.services || [];
    const grouped: ServiceGroup[] = serviceGroupDefinitions.map((definition) => ({
      key: definition.key,
      title: definition.title,
      description: definition.description,
      services: source.filter((service) => definition.match(service.service_key)),
    })).filter((group) => group.services.length > 0);
    const known = new Set(grouped.flatMap((group) => group.services.map((service) => service.service_key)));
    const other = source.filter((service) => !known.has(service.service_key));
    if (other.length) grouped.push({ key: "other", title: "سایر خدمات", description: "تعرفه‌های تکمیلی سامانه", services: other });
    return grouped;
  }, [data?.services]);

  async function patch(body: Record<string, unknown>, key: string, reloadAfter = true) {
    setWorkingKey(key);
    setError("");
    setNotice("");
    try {
      const response = await fetchAdminCommerce({
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const payload = await readJson<{ success?: boolean; message?: string; discount_id?: number }>(response);
      if (!response.ok || !payload.success) throw new Error(payload.message || "ذخیره تغییرات انجام نشد.");
      setNotice(payload.message || "تغییرات ذخیره شد.");
      if (reloadAfter) await load(activeTab === "overview" ? "overview" : activeTab);
      return payload;
    } catch (patchError) {
      setError(patchError instanceof Error ? patchError.message : "خطای ناشناخته");
      return null;
    } finally {
      setWorkingKey("");
    }
  }

  function updateServiceDraft(key: string, updates: Partial<Service>) {
    setServiceDrafts((current) => ({ ...current, [key]: { ...current[key], ...updates } }));
  }

  function updateProvinceDraft(name: string, updates: Partial<Province>) {
    setProvinceDrafts((current) => ({ ...current, [name]: { ...current[name], ...updates } }));
  }

  function updateDiscountDraft(id: number, updates: Partial<DiscountCode>) {
    setDiscountDrafts((current) => ({ ...current, [id]: { ...current[id], ...updates } }));
  }

  function toggleDiscountArray(target: "new" | number, field: "allowed_services" | "allowed_audiences" | "allowed_provinces", value: string) {
    if (target === "new") {
      setNewDiscount((current) => ({
        ...current,
        [field]: current[field].includes(value) ? current[field].filter((item) => item !== value) : [...current[field], value],
      }));
      return;
    }
    const current = discountDrafts[target]?.[field] || [];
    updateDiscountDraft(target, { [field]: current.includes(value) ? current.filter((item) => item !== value) : [...current, value] });
  }

  async function createDiscount() {
    if (newDiscountGeoMode === "selected" && newDiscount.allowed_provinces.length === 0) {
      setError("برای محدودیت استانی، حداقل یک استان را انتخاب کنید.");
      setDiscountStep(3);
      return;
    }
    const snapshot = { ...newDiscount, allowed_services: [...newDiscount.allowed_services], allowed_audiences: [...newDiscount.allowed_audiences], allowed_provinces: [...newDiscount.allowed_provinces], allowed_mobiles: [...newDiscount.allowed_mobiles] };
    const result = await patch({ action: "create_discount", ...snapshot }, "discount-create", false);
    if (!result?.success) return;
    const optimistic: DiscountCode = {
      ...snapshot,
      id: Number(result.discount_id || Date.now()),
      used_count: 0,
      unique_users: 0,
      total_discount_toman: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setData((current) => current ? { ...current, discounts: [optimistic, ...(current.discounts || []).filter((item) => item.code !== optimistic.code)] } : current);
    setDiscountDrafts((current) => ({ ...current, [optimistic.id]: optimistic }));
    setNewDiscount({ ...emptyDiscount });
    setNewDiscountGeoMode("all");
    setDiscountProvinceSearch("");
    setDiscountStep(1);
    setDiscountCreatorOpen(false);
  }

  function updateSubscriptionDraft(id: number, updates: Partial<Subscription>) {
    setSubscriptionDrafts((current) => ({ ...current, [id]: { ...current[id], ...updates } }));
  }

  function updateAdminDraft(id: number, updates: Partial<AdminUser>) {
    setAdminDrafts((current) => ({ ...current, [id]: { ...current[id], ...updates } }));
  }


  function toggleNewAdminPermission(permission: string) {
    setNewAdmin((current) => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter((item) => item !== permission)
        : [...current.permissions, permission],
    }));
  }

  async function createAdmin() {
    await patch({ action: "create_admin", ...newAdmin }, "admin-create");
    setNewAdmin({ mobile: "", display_name: "", role: "viewer", permissions: [], can_view_sensitive_finance: false });
  }

  function toggleAdminPermission(id: number, permission: string) {
    const current = adminDrafts[id]?.permissions || [];
    updateAdminDraft(id, {
      permissions: current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission],
    });
  }

  if (loading) {
    return <main className={styles.page} dir="rtl"><section className={styles.stateCard}><span className={styles.loader} /><h1>در حال بارگذاری مدیریت تجاری</h1><p>تعرفه‌ها، سفارش‌ها و سطح دسترسی‌ها در حال دریافت است.</p></section></main>;
  }

  if (!data?.success) {
    return (
      <main className={styles.page} dir="rtl">
        <section className={styles.stateCard}>
          <h1>مدیریت تجاری بارگذاری نشد</h1>
          <p>{error || "حساب فعلی مجوز این بخش را ندارد."}</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button type="button" onClick={() => void load(activeTab === "overview" ? "overview" : activeTab, !data)}>تلاش دوباره</button>
            <Link href="/admin">بررسی پنل مدیریت</Link>
            <Link href="/account">بازگشت به حساب</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.headerText}>
            <Link href="/admin" className={styles.back}>مدیریت سایت / مدیریت تجاری</Link>
            <span className={styles.eyebrow}>کنترل مرکزی چاکود</span>
            <h1>مدیریت مالی و تجاری</h1>
            <p>تعرفه‌ها، پرداخت‌ها، تبلیغات و سطح دسترسی مدیران را بدون ویرایش کد کنترل کنید.</p>
          </div>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.refreshButton}
              disabled={Boolean(sectionLoading)}
              onClick={() => void load(activeTab, activeTab === "overview")}
            >
              {sectionLoading ? "در حال به‌روزرسانی..." : "به‌روزرسانی اطلاعات"}
            </button>
            {caps?.admins_view && (
              <button type="button" className={styles.secretButton} onClick={() => setActiveTab("admins")}>
                تنظیمات دسترسی
              </button>
            )}
          </div>
        </header>

        <div className={styles.adminLayout}>
          <aside className={styles.sidebar}>
            <nav className={styles.tabs} aria-label="بخش‌های مدیریت تجاری">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={activeTab === tab.key ? styles.activeTab : ""}
                  onClick={() => setActiveTab(tab.key)}
                >
                  <span className={styles.tabIcon} aria-hidden="true">{tabIcons[tab.key]}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
            <div className={styles.accessCard}>
              <span>سطح دسترسی شما</span>
              <strong>{hasFullAccess ? "مالک سیستم" : "مدیر محدود"}</strong>
              <small>{hasFullAccess ? "دسترسی کامل به تنظیمات تجاری" : `${formatNumber(enabledCapabilities.length)} مجوز فعال`}</small>
            </div>
            <Link href="/account" className={styles.accountLink}>بازگشت به حساب کاربری</Link>
          </aside>

          <section className={styles.content}>
            {error && activeTab !== "overview" && !loadedSections.includes(activeTab) && <div className={styles.error}>{error}</div>}
            {error && activeTab !== "overview" && loadedSections.includes(activeTab) && <div className={styles.syncNote}><span>اطلاعات ذخیره‌شده نمایش داده می‌شود؛ همگام‌سازی دوباره کامل نشد.</span><button type="button" onClick={()=>void load(activeTab)}>تلاش دوباره</button></div>}
            {activeTab !== "overview" && (data.warnings || []).length > 0 && (
              <details className={styles.warningDetails}>
                <summary>بخشی از اطلاعات این صفحه کامل دریافت نشد</summary>
                {(data.warnings || []).map((warning, index) => <p key={`${warning}-${index}`}>{warning}</p>)}
              </details>
            )}
            {notice && <div className={styles.notice}>{notice}</div>}
            {sectionLoading && <div className={styles.notice}>در حال دریافت اطلاعات این بخش...</div>}

            {activeTab === "overview" && (
              <>
                {error && (
                  <div className={styles.syncNote}>
                    <span>اطلاعات موجود نمایش داده می‌شود؛ آخرین به‌روزرسانی کامل نشد.</span>
                    <button type="button" onClick={() => void load("overview")}>تلاش دوباره</button>
                  </div>
                )}

                <section className={styles.summaryGrid}>
                  {data.summary?.revenue_30d !== null && (
                    <article className={`${styles.summaryCard} ${styles.summaryAccent}`}>
                      <div className={styles.summaryIcon}>ت</div>
                      <div><span>درآمد ۳۰ روز اخیر</span><strong>{formatToman(data.summary?.revenue_30d)}</strong><small>مجموع پرداخت‌های موفق</small></div>
                    </article>
                  )}
                  {data.summary?.paid_orders_30d !== null && (
                    <article className={styles.summaryCard}>
                      <div className={styles.summaryIcon}>✓</div>
                      <div><span>سفارش‌های موفق</span><strong>{formatNumber(data.summary?.paid_orders_30d)}</strong><small>در ۳۰ روز اخیر</small></div>
                    </article>
                  )}
                  {data.summary?.pending_orders !== null && (
                    <article className={styles.summaryCard}>
                      <div className={styles.summaryIcon}>…</div>
                      <div><span>پرداخت‌های در انتظار</span><strong>{formatNumber(data.summary?.pending_orders)}</strong><small>پیش‌فاکتورهای باز</small></div>
                    </article>
                  )}
                  {data.summary?.active_subscriptions !== null && (
                    <article className={styles.summaryCard}>
                      <div className={styles.summaryIcon}>◫</div>
                      <div><span>اشتراک حرفه‌ای فعال</span><strong>{formatNumber(data.summary?.active_subscriptions)}</strong><small>نمایشگاه، تعمیرگاه و یدکی</small></div>
                    </article>
                  )}
                </section>

                <section className={styles.dashboardGrid}>
                  <article className={`${styles.panel} ${styles.revenuePanel}`}>
                    <header className={styles.analyticsHeader}>
                      <div><span>عملکرد مالی</span><h2>روند درآمد ۳۰ روز اخیر</h2><small>مبالغ فقط از سفارش‌های پرداخت‌شده محاسبه شده‌اند.</small></div>
                      <strong>{formatToman(data.summary?.revenue_30d)}</strong>
                    </header>
                    {revenueChartHasData ? (
                      <div className={styles.chartBox}>
                        <svg viewBox="0 0 900 240" role="img" aria-label="نمودار درآمد سی روز اخیر">
                          <defs>
                            <linearGradient id="chakodRevenueArea" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#8134e7" stopOpacity="0.34" />
                              <stop offset="100%" stopColor="#8134e7" stopOpacity="0.02" />
                            </linearGradient>
                          </defs>
                          <line x1="24" y1="46" x2="876" y2="46" className={styles.chartGridLine} />
                          <line x1="24" y1="128" x2="876" y2="128" className={styles.chartGridLine} />
                          <line x1="24" y1="210" x2="876" y2="210" className={styles.chartGridLine} />
                          <polygon points={chartAreaPoints} fill="url(#chakodRevenueArea)" />
                          <polyline points={chartPoints} className={styles.chartLine} />
                          {revenueSeries.filter((item) => item.amount_toman > 0).map((item, index) => {
                            const sourceIndex = revenueSeries.findIndex((source) => source.date === item.date);
                            const x = 24 + (sourceIndex / Math.max(1, revenueSeries.length - 1)) * 852;
                            const y = 210 - (item.amount_toman / revenueMax) * 164;
                            return <circle key={`${item.date}-${index}`} cx={x} cy={y} r="4" className={styles.chartDot}><title>{`${item.date}: ${formatToman(item.amount_toman)}`}</title></circle>;
                          })}
                        </svg>
                        <div className={styles.chartAxisLabels}>
                          <span>{new Intl.DateTimeFormat("fa-IR", { month: "short", day: "numeric" }).format(new Date(`${revenueSeries[0]?.date}T12:00:00`))}</span>
                          <span>امروز</span>
                        </div>
                      </div>
                    ) : (
                      <div className={styles.analyticsEmpty}><strong>هنوز درآمد ثبت‌شده‌ای وجود ندارد</strong><span>پس از اولین پرداخت موفق، نمودار به‌صورت خودکار ساخته می‌شود.</span></div>
                    )}
                  </article>

                  <article className={`${styles.panel} ${styles.actionPanel}`}>
                    <header>
                      <div><span>اقدام سریع</span><h2>اقدامات در انتظار شما</h2></div>
                      <small>مواردی که نیاز به بررسی یا تصمیم دارند.</small>
                    </header>
                    <div className={styles.quickActions}>
                      {caps?.orders_view && Number(data.summary?.pending_orders || 0) > 0 && <button onClick={() => setActiveTab("orders")}><span><b>پرداخت‌های ناتمام</b><small>پیگیری پیش‌فاکتورها و تراکنش‌های باز</small></span><em>{formatNumber(data.summary?.pending_orders)}</em></button>}
                      {Number(data.summary?.pending_orders || 0) === 0 && <div className={styles.clearQueue}><b>مورد فوری وجود ندارد</b><small>همه صف‌های عملیاتی در وضعیت عادی هستند.</small></div>}
                    </div>
                    <div className={styles.managerIdentity}>
                      <span>نقش فعلی</span>
                      <strong>{hasFullAccess ? "مالک سیستم" : "مدیر محدود"}</strong>
                      <small>{hasFullAccess ? "دسترسی کامل به مدیریت تجاری" : `${formatNumber(enabledCapabilities.length)} مجوز فعال`}</small>
                    </div>
                  </article>
                </section>

                <section className={styles.insightGrid}>
                  <article className={`${styles.panel} ${styles.breakdownPanel}`}>
                    <header><div><span>ترکیب فروش</span><h2>درآمد بر اساس خدمت</h2></div><small>۳۰ روز اخیر</small></header>
                    <div className={styles.breakdownList}>
                      {revenueBreakdown.map((item) => (
                        <div className={styles.breakdownItem} key={item.service_key}>
                          <div className={styles.breakdownMeta}><span><b>{item.title}</b><small>{formatNumber(item.orders_count)} سفارش</small></span><strong>{formatToman(item.amount_toman)}</strong></div>
                          <div className={styles.breakdownTrack}><i style={{ width: `${Math.max(4, (item.amount_toman / maxServiceRevenue) * 100)}%` }} /></div>
                        </div>
                      ))}
                      {revenueBreakdown.length === 0 && <div className={styles.analyticsEmpty}><strong>تفکیک درآمد هنوز در دسترس نیست</strong><span>بعد از ثبت پرداخت‌های موفق نمایش داده می‌شود.</span></div>}
                    </div>
                  </article>

                  <article className={`${styles.panel} ${styles.recentPanel}`}>
                    <header><div><span>فعالیت اخیر</span><h2>آخرین تراکنش‌ها</h2></div>{caps?.orders_view && <button type="button" onClick={() => setActiveTab("orders")}>مشاهده همه</button>}</header>
                    <div className={styles.recentList}>
                      {recentOrders.map((order) => (
                        <div key={order.id} className={styles.recentItem}>
                          <div><strong>{serviceTitleByKey[order.service_key] || order.service_key}</strong><small>{order.dealer_name || order.full_name || "کاربر چاکود"} · {formatDate(order.created_at)}</small></div>
                          <span><b>{formatToman(order.total_amount_toman)}</b><em className={`${styles.status} ${styles[`status_${order.status}`] || ""}`}>{statusLabels[order.status] || order.status}</em></span>
                        </div>
                      ))}
                      {recentOrders.length === 0 && <div className={styles.analyticsEmpty}><strong>تراکنشی ثبت نشده است</strong><span>آخرین سفارش‌های تجاری در این قسمت نمایش داده می‌شوند.</span></div>}
                    </div>
                  </article>
                </section>

              </>
            )}

        {activeTab === "pricing" && caps?.pricing_view && (
          <section className={styles.managementSection}>
            <header className={styles.sectionHeader}>
              <div><span>قیمت‌گذاری پایه</span><h2>تعرفه خدمات</h2><p>خدمات مشابه در یک گروه قرار گرفته‌اند تا قیمت‌ها بدون تکرار و سردرگمی مدیریت شوند.</p></div>
            </header>
            <div className={styles.serviceGroupList}>
              {serviceGroups.map((group) => (
                <article className={styles.serviceGroupCard} key={group.key}>
                  <header><div><h3>{group.title}</h3><p>{group.description}</p></div><span>{formatNumber(group.services.length)} تعرفه</span></header>
                  <div className={styles.serviceGroupRows}>
                    {group.services.map((service) => {
                      const draft = serviceDrafts[service.service_key] || service;
                      return <div className={styles.serviceEditorRow} key={service.service_key}>
                        <div className={styles.serviceIdentity}><b>{draft.title}</b><small>{serviceAudienceLabels[draft.audience] || draft.audience} · {formatDuration(draft)}</small></div>
                        <label>مبلغ تومان<input type="number" value={draft.amount_toman} disabled={!caps.pricing_manage} onChange={(event)=>updateServiceDraft(service.service_key,{amount_toman:Number(event.target.value)})}/></label>
                        <label>مدت<input type="number" value={draft.duration_value} disabled={!caps.pricing_manage} onChange={(event)=>updateServiceDraft(service.service_key,{duration_value:Number(event.target.value)})}/></label>
                        <label>واحد<select value={draft.duration_unit} disabled={!caps.pricing_manage} onChange={(event)=>updateServiceDraft(service.service_key,{duration_unit:event.target.value})}><option value="none">بدون مدت</option><option value="hour">ساعت</option><option value="day">روز</option><option value="month">ماه</option></select></label>
                        <label className={styles.compactSwitch}><input type="checkbox" checked={draft.is_active} disabled={!caps.pricing_manage} onChange={(event)=>updateServiceDraft(service.service_key,{is_active:event.target.checked})}/><span>{draft.is_active?"فعال":"غیرفعال"}</span></label>
                        {caps.pricing_manage && <button className={styles.tableButton} disabled={workingKey===`service-${service.service_key}`} onClick={()=>void patch({action:"update_service",...draft},`service-${service.service_key}`)}>{workingKey===`service-${service.service_key}`?"...":"ذخیره"}</button>}
                      </div>;
                    })}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeTab === "provinces" && caps?.pricing_view && (
          <section className={styles.panel}>
            <header className={styles.panelHeader}>
              <div><span>طبقه‌بندی و استثناها</span><h2>تنظیمات استان‌ها</h2><p className={styles.sectionDescription}>قیمت پایه استان عادی و بزرگ در «تعرفه خدمات» تعیین می‌شود؛ اینجا فقط گروه استان، ظرفیت و استثناهای محلی را مدیریت کنید.</p></div>
              <div className={styles.headerFilters}>
                <input className={styles.search} value={provinceSearch} onChange={(event)=>setProvinceSearch(event.target.value)} placeholder="جست‌وجوی استان" />
                <select value={provinceClassFilter} onChange={(event)=>setProvinceClassFilter(event.target.value as "all"|"regular"|"large")}><option value="all">همه استان‌ها</option><option value="regular">استان عادی</option><option value="large">استان بزرگ</option></select>
              </div>
            </header>
            <div className={styles.tableWrap}><table><thead><tr><th>استان</th><th>گروه بزرگ</th><th>استوری ۲۴ساعته</th><th>وضعیت</th><th /></tr></thead><tbody>{filteredProvinces.map((province)=>{const draft=provinceDrafts[province.province]||province;return <tr key={province.province}><td><strong>{province.province}</strong><small>{draft.is_large?"استان بزرگ":"استان عادی"}</small></td><td><input type="checkbox" checked={draft.is_large} disabled={!caps.pricing_manage} onChange={(event)=>updateProvinceDraft(province.province,{is_large:event.target.checked})}/></td><td><input type="number" value={draft.story_price_toman} disabled={!caps.pricing_manage} onChange={(event)=>updateProvinceDraft(province.province,{story_price_toman:Number(event.target.value)})}/></td><td><label className={styles.miniCheck}><input type="checkbox" checked={draft.story_is_active} disabled={!caps.pricing_manage} onChange={(event)=>updateProvinceDraft(province.province,{story_is_active:event.target.checked})}/><span>استوری</span></label></td><td>{caps.pricing_manage&&<button className={styles.tableButton} disabled={workingKey===`province-${province.province}`} onClick={()=>void patch({action:"update_province",province:draft.province,is_large:draft.is_large,story_price_toman:draft.story_price_toman,story_duration_hours:draft.story_duration_hours,story_is_active:draft.story_is_active},`province-${province.province}`)}>ذخیره</button>}</td></tr>})}{filteredProvinces.length===0&&<tr><td colSpan={5}><div className={styles.inlineEmpty}>استانی با این فیلتر پیدا نشد.</div></td></tr>}</tbody></table></div>
          </section>
        )}

        {activeTab === "discounts" && caps?.discounts_view && (
          <section className={styles.discountWorkspace}>
            <header className={styles.discountToolbar}>
              <div>
                <span>کمپین‌ها و اعتبار خرید</span>
                <h2>کدهای تخفیف</h2>
                <small>ایجاد، توقف و بررسی عملکرد کدها بدون شلوغی فرم‌های هم‌زمان.</small>
              </div>
              <div className={styles.discountToolbarActions}>
                <input className={styles.search} value={discountSearch} onChange={(event)=>setDiscountSearch(event.target.value)} placeholder="جست‌وجوی کد یا عنوان" />
                {caps.discounts_manage && <button className={styles.primaryAction} onClick={()=>{setDiscountCreatorOpen((current)=>!current);setEditingDiscountId(null);setDiscountStep(1);setNewDiscountGeoMode(newDiscount.allowed_provinces.length?"selected":"all")}}>{discountCreatorOpen?"بستن فرم":"ساخت کد جدید"}</button>}
              </div>
            </header>

            {discountCreatorOpen && caps.discounts_manage && (
              <article className={styles.discountComposer}>
                <header className={styles.composerHeader}>
                  <div><span>کمپین جدید</span><h3>ساخت کد تخفیف</h3><small>تنظیمات در سه مرحله کوتاه تکمیل می‌شوند.</small></div>
                  <button type="button" className={styles.iconClose} onClick={()=>setDiscountCreatorOpen(false)}>×</button>
                </header>
                <nav className={styles.discountSteps} aria-label="مراحل ساخت کد تخفیف">
                  {[{id:1,label:"اطلاعات پایه"},{id:2,label:"محدودیت‌ها"},{id:3,label:"مخاطبان و استان"}].map((item)=><button key={item.id} type="button" className={discountStep===item.id?styles.discountStepActive:""} onClick={()=>setDiscountStep(item.id as DiscountStep)}><span>{formatNumber(item.id)}</span>{item.label}</button>)}
                </nav>

                {discountStep===1 && <section className={styles.formSection}>
                  <div className={styles.sectionTitle}><b>اطلاعات پایه کمپین</b><small>موارد الزامی</small></div>
                  <div className={styles.formGridFour}>
                    <label>کد تخفیف<input dir="ltr" value={newDiscount.code} onChange={(event)=>setNewDiscount({...newDiscount,code:event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g,"")})} placeholder="CHAKOD20"/></label>
                    <label className={styles.wideField}>عنوان کمپین<input value={newDiscount.title} onChange={(event)=>setNewDiscount({...newDiscount,title:event.target.value})} placeholder="کمپین افتتاحیه"/></label>
                    <label>نوع تخفیف<select value={newDiscount.discount_type} onChange={(event)=>setNewDiscount({...newDiscount,discount_type:event.target.value as "percent"|"fixed"})}><option value="percent">درصدی</option><option value="fixed">مبلغ ثابت</option></select></label>
                    <label>{newDiscount.discount_type==="percent"?"درصد تخفیف":"مبلغ تخفیف"}<input type="number" min={1} max={newDiscount.discount_type==="percent"?100:undefined} value={newDiscount.discount_value} onChange={(event)=>setNewDiscount({...newDiscount,discount_value:Number(event.target.value)})}/></label>
                  </div>
                  <label>توضیح کوتاه<textarea value={newDiscount.description || ""} onChange={(event)=>setNewDiscount({...newDiscount,description:event.target.value})} placeholder="توضیح داخلی یا پیام کمپین"/></label>
                  <div className={styles.formGridTwo}><label>شروع اعتبار<PersianDatePicker includeTime value={newDiscount.starts_at} onChange={(value)=>setNewDiscount({...newDiscount,starts_at:value})} placeholder="انتخاب تاریخ و ساعت شروع"/></label><label>پایان اعتبار<PersianDatePicker includeTime value={newDiscount.expires_at} onChange={(value)=>setNewDiscount({...newDiscount,expires_at:value})} placeholder="انتخاب تاریخ و ساعت پایان"/></label></div>
                </section>}

                {discountStep===2 && <section className={styles.formSection}>
                  <div className={styles.sectionTitle}><b>محدودیت مالی و مصرف</b><small>خالی بماند یعنی نامحدود</small></div>
                  <div className={styles.formGridTwo}>
                    <label>حداقل مبلغ سفارش<input type="number" value={newDiscount.min_order_toman} onChange={(event)=>setNewDiscount({...newDiscount,min_order_toman:Number(event.target.value)})}/></label>
                    <label>حداکثر مبلغ تخفیف<input type="number" value={newDiscount.max_discount_toman ?? ""} onChange={(event)=>setNewDiscount({...newDiscount,max_discount_toman:event.target.value===""?null:Number(event.target.value)})} placeholder="بدون سقف"/></label>
                    <label>حداکثر استفاده کل<input type="number" value={newDiscount.usage_limit_total ?? ""} onChange={(event)=>setNewDiscount({...newDiscount,usage_limit_total:event.target.value===""?null:Number(event.target.value)})} placeholder="نامحدود"/></label>
                    <label>حداکثر استفاده هر کاربر<input type="number" value={newDiscount.usage_limit_per_user ?? ""} onChange={(event)=>setNewDiscount({...newDiscount,usage_limit_per_user:event.target.value===""?null:Number(event.target.value)})} placeholder="نامحدود"/></label>
                  </div>
                  <div className={styles.optionCards}><label className={newDiscount.first_purchase_only?styles.optionCardActive:""}><input type="checkbox" checked={newDiscount.first_purchase_only} onChange={(event)=>setNewDiscount({...newDiscount,first_purchase_only:event.target.checked})}/><span><b>فقط اولین خرید</b><small>کاربر قبلاً سفارش موفق نداشته باشد.</small></span></label><label className={newDiscount.is_stackable?styles.optionCardActive:""}><input type="checkbox" checked={newDiscount.is_stackable} onChange={(event)=>setNewDiscount({...newDiscount,is_stackable:event.target.checked})}/><span><b>قابل ترکیب</b><small>هم‌زمان با اعتبار یا تخفیف دیگر استفاده شود.</small></span></label></div>
                </section>}

                {discountStep===3 && <section className={styles.formSection}>
                  <div className={styles.sectionTitle}><b>خدمات، حساب‌ها و محدوده جغرافیایی</b><small>برای همه موارد، چیزی انتخاب نکنید.</small></div>
                  <div className={styles.scopeGroup}><strong>خدمات مشمول</strong><div>{(data.services||[]).map((service)=><label key={service.service_key} className={newDiscount.allowed_services.includes(service.service_key)?styles.scopeOn:""}><input type="checkbox" checked={newDiscount.allowed_services.includes(service.service_key)} onChange={()=>toggleDiscountArray("new","allowed_services",service.service_key)}/><span>{service.title}</span></label>)}</div></div>
                  <div className={styles.scopeGroup}><strong>نوع حساب</strong><div>{[["personal","شخصی"],["dealer","نمایشگاه"],["professional","حرفه‌ای"]].map(([value,label])=><label key={value} className={newDiscount.allowed_audiences.includes(value)?styles.scopeOn:""}><input type="checkbox" checked={newDiscount.allowed_audiences.includes(value)} onChange={()=>toggleDiscountArray("new","allowed_audiences",value)}/><span>{label}</span></label>)}</div><small>بدون انتخاب یعنی همه نوع حساب‌ها.</small></div>
                  <div className={styles.geoSelector}>
                    <strong>محدوده جغرافیایی</strong>
                    <div className={styles.geoModeRow}><label className={newDiscountGeoMode==="all"?styles.geoModeActive:""}><input type="radio" name="discount-geo-mode" checked={newDiscountGeoMode==="all"} onChange={()=>{setNewDiscountGeoMode("all");setNewDiscount({...newDiscount,allowed_provinces:[]})}}/><span><b>سراسر ایران</b><small>بدون محدودیت استانی</small></span></label><label className={newDiscountGeoMode==="selected"?styles.geoModeActive:""}><input type="radio" name="discount-geo-mode" checked={newDiscountGeoMode==="selected"} onChange={()=>setNewDiscountGeoMode("selected")}/><span><b>استان‌های منتخب</b><small>فقط در استان‌های انتخاب‌شده</small></span></label></div>
                    {newDiscountGeoMode==="selected" && <div className={styles.provinceSelectionPanel}>
                      <div className={styles.provinceSelectionToolbar}><input value={discountProvinceSearch} onChange={(event)=>setDiscountProvinceSearch(event.target.value)} placeholder="جست‌وجوی استان"/><span>{formatNumber(newDiscount.allowed_provinces.length)} استان انتخاب شده</span><button type="button" onClick={()=>setNewDiscount({...newDiscount,allowed_provinces:[]})}>پاک‌کردن</button></div>
                      {newDiscount.allowed_provinces.length>0&&<div className={styles.selectedProvinceChips}>{newDiscount.allowed_provinces.map((province)=><button type="button" key={province} onClick={()=>toggleDiscountArray("new","allowed_provinces",province)}>{province}<span>×</span></button>)}</div>}
                      <div className={styles.provincePicker}><div>{filteredDiscountProvinces.map((item)=><label key={item.province} className={newDiscount.allowed_provinces.includes(item.province)?styles.scopeOn:""}><input type="checkbox" checked={newDiscount.allowed_provinces.includes(item.province)} onChange={()=>toggleDiscountArray("new","allowed_provinces",item.province)}/><span>{item.province}</span></label>)}</div></div>
                    </div>}
                  </div>
                  <label>شماره‌های خاص، هر شماره در یک خط<textarea dir="ltr" value={newDiscount.allowed_mobiles.join("\n")} onChange={(event)=>setNewDiscount({...newDiscount,allowed_mobiles:event.target.value.split(/\s+/).filter(Boolean)})} placeholder={"0912...\n0935..."}/><small>خالی بماند یعنی همه کاربران واجد شرایط.</small></label>
                  <label className={styles.checkField}><input type="checkbox" checked={newDiscount.is_active} onChange={(event)=>setNewDiscount({...newDiscount,is_active:event.target.checked})}/><span>پس از ساخت فعال باشد</span></label>
                </section>}

                <footer className={styles.composerFooter}>
                  <button type="button" className={styles.lightButton} onClick={()=>discountStep===1?setDiscountCreatorOpen(false):setDiscountStep((discountStep-1) as DiscountStep)}>{discountStep===1?"انصراف":"مرحله قبل"}</button>
                  {discountStep<3?<button type="button" onClick={()=>setDiscountStep((discountStep+1) as DiscountStep)} disabled={discountStep===1&&(newDiscount.code.length<3||!newDiscount.title||newDiscount.discount_value<=0)}>مرحله بعد</button>:<button disabled={workingKey==="discount-create"||newDiscount.code.length<3||!newDiscount.title||newDiscount.discount_value<=0||(newDiscountGeoMode==="selected"&&newDiscount.allowed_provinces.length===0)} onClick={()=>void createDiscount()}>{workingKey==="discount-create"?"در حال ساخت...":"ساخت کد تخفیف"}</button>}
                </footer>
              </article>
            )}

            {filteredDiscounts.length ? (
              <div className={styles.discountGrid}>
                {filteredDiscounts.map((coupon)=>{const draft=discountDrafts[coupon.id]||coupon;const editing=editingDiscountId===coupon.id;return <article className={`${styles.discountSummaryCard} ${editing?styles.discountCardEditing:""}`} key={coupon.id}>
                  <header>
                    <div className={styles.couponIdentity}><code>{draft.code}</code><div><h3>{draft.title}</h3><span>{draft.description||"بدون توضیح"}</span></div></div>
                    <div className={styles.couponValue}><strong>{draft.discount_type==="percent"?`${formatNumber(draft.discount_value)}٪`:formatToman(draft.discount_value)}</strong><span className={`${styles.status} ${draft.is_active?styles.status_active:styles.status_cancelled}`}>{draft.is_active?"فعال":"غیرفعال"}</span></div>
                  </header>
                  <div className={styles.couponMeta}>
                    <span>شروع: {draft.starts_at?formatPersianDate(draft.starts_at,true):"فوری"}</span>
                    <span>پایان: {draft.expires_at?formatPersianDate(draft.expires_at,true):"بدون انقضا"}</span>
                    <span>{draft.allowed_services.length?`${formatNumber(draft.allowed_services.length)} خدمت`:"همه خدمات"}</span>
                    <span>{draft.allowed_provinces.length?`${formatNumber(draft.allowed_provinces.length)} استان`:"سراسر ایران"}</span>
                  </div>
                  <div className={styles.discountStats}><div><span>استفاده موفق</span><b>{formatNumber(coupon.used_count)}</b></div><div><span>کاربر یکتا</span><b>{formatNumber(coupon.unique_users)}</b></div><div><span>تخفیف داده‌شده</span><b>{formatToman(coupon.total_discount_toman)}</b></div></div>
                  <footer className={styles.cardFooter}><span>{coupon.created_at?`ساخته‌شده در ${formatPersianDate(coupon.created_at)}`:""}</span>{caps.discounts_manage&&<button className={styles.editButton} onClick={()=>{setEditingDiscountId(editing?null:coupon.id);setDiscountCreatorOpen(false)}}>{editing?"بستن ویرایش":"ویرایش"}</button>}</footer>

                  {editing && (
                    <div className={styles.discountEditor}>
                      <section className={styles.formSection}>
                        <div className={styles.formGridFour}>
                          <label>کد<input dir="ltr" value={draft.code} onChange={(event)=>updateDiscountDraft(coupon.id,{code:event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g,"")})}/></label>
                          <label className={styles.wideField}>عنوان<input value={draft.title} onChange={(event)=>updateDiscountDraft(coupon.id,{title:event.target.value})}/></label>
                          <label>نوع<select value={draft.discount_type} onChange={(event)=>updateDiscountDraft(coupon.id,{discount_type:event.target.value as "percent"|"fixed"})}><option value="percent">درصدی</option><option value="fixed">مبلغ ثابت</option></select></label>
                          <label>مقدار<input type="number" value={draft.discount_value} onChange={(event)=>updateDiscountDraft(coupon.id,{discount_value:Number(event.target.value)})}/></label>
                        </div>
                        <label>توضیح<textarea value={draft.description||""} onChange={(event)=>updateDiscountDraft(coupon.id,{description:event.target.value})}/></label>
                        <div className={styles.formGridTwo}><label>شروع<PersianDatePicker includeTime value={draft.starts_at} onChange={(value)=>updateDiscountDraft(coupon.id,{starts_at:value})}/></label><label>پایان<PersianDatePicker includeTime value={draft.expires_at} onChange={(value)=>updateDiscountDraft(coupon.id,{expires_at:value})}/></label></div>
                      </section>
                      <details className={styles.advancedBlock}><summary><span>محدودیت‌ها</span><small>بازکردن</small></summary><div className={styles.formGridThree}><label>حداقل سفارش<input type="number" value={draft.min_order_toman} onChange={(event)=>updateDiscountDraft(coupon.id,{min_order_toman:Number(event.target.value)})}/></label><label>سقف تخفیف<input type="number" value={draft.max_discount_toman??""} onChange={(event)=>updateDiscountDraft(coupon.id,{max_discount_toman:event.target.value===""?null:Number(event.target.value)})}/></label><label>سقف کل<input type="number" value={draft.usage_limit_total??""} onChange={(event)=>updateDiscountDraft(coupon.id,{usage_limit_total:event.target.value===""?null:Number(event.target.value)})}/></label><label>سقف هر کاربر<input type="number" value={draft.usage_limit_per_user??""} onChange={(event)=>updateDiscountDraft(coupon.id,{usage_limit_per_user:event.target.value===""?null:Number(event.target.value)})}/></label></div></details>
                      <details className={styles.advancedBlock}><summary><span>خدمات و مخاطبان</span><small>بازکردن</small></summary><div className={styles.scopeGroup}><strong>خدمات</strong><div>{(data.services||[]).map((service)=><label key={service.service_key} className={draft.allowed_services.includes(service.service_key)?styles.scopeOn:""}><input type="checkbox" checked={draft.allowed_services.includes(service.service_key)} onChange={()=>toggleDiscountArray(coupon.id,"allowed_services",service.service_key)}/><span>{service.title}</span></label>)}</div></div><div className={styles.scopeGroup}><strong>نوع حساب</strong><div>{[["personal","شخصی"],["dealer","نمایشگاه"],["professional","حرفه‌ای"],["all","همه"]].map(([value,label])=><label key={value} className={draft.allowed_audiences.includes(value)?styles.scopeOn:""}><input type="checkbox" checked={draft.allowed_audiences.includes(value)} onChange={()=>toggleDiscountArray(coupon.id,"allowed_audiences",value)}/><span>{label}</span></label>)}</div></div></details>
                      <details className={styles.advancedBlock}><summary><span>استان‌ها و کاربران خاص</span><small>بازکردن</small></summary><div className={styles.provincePicker}><div>{(data.provinces||[]).map((item)=><label key={item.province} className={draft.allowed_provinces.includes(item.province)?styles.scopeOn:""}><input type="checkbox" checked={draft.allowed_provinces.includes(item.province)} onChange={()=>toggleDiscountArray(coupon.id,"allowed_provinces",item.province)}/><span>{item.province}</span></label>)}</div></div><label>شماره‌های مجاز<textarea dir="ltr" value={draft.allowed_mobiles.join("\n")} onChange={(event)=>updateDiscountDraft(coupon.id,{allowed_mobiles:event.target.value.split(/\s+/).filter(Boolean)})}/></label></details>
                      <footer className={styles.composerFooter}><div className={styles.inlineChecks}><label><input type="checkbox" checked={draft.first_purchase_only} onChange={(event)=>updateDiscountDraft(coupon.id,{first_purchase_only:event.target.checked})}/><span>فقط اولین خرید</span></label><label><input type="checkbox" checked={draft.is_active} onChange={(event)=>updateDiscountDraft(coupon.id,{is_active:event.target.checked})}/><span>فعال</span></label></div><button disabled={workingKey===`discount-${coupon.id}`} onClick={()=>void patch({action:"update_discount",discount_id:coupon.id,...draft},`discount-${coupon.id}`)}>{workingKey===`discount-${coupon.id}`?"در حال ذخیره...":"ذخیره تغییرات"}</button></footer>
                    </div>
                  )}
                </article>})}
              </div>
            ) : (
              <div className={styles.discountEmpty}><div>٪</div><h3>هنوز کد تخفیفی ساخته نشده</h3><p>برای اولین کمپین، روی «ساخت کد جدید» بزنید.</p>{caps.discounts_manage&&<button onClick={()=>setDiscountCreatorOpen(true)}>ساخت اولین کد</button>}</div>
            )}
          </section>
        )}

        {activeTab === "orders" && caps?.orders_view && (
          <section className={styles.panel}>
            <header className={styles.panelHeader}><div><span>پرداخت و فاکتور</span><h2>سفارش‌های تجاری</h2></div><input className={styles.search} value={orderSearch} onChange={(event)=>setOrderSearch(event.target.value)} placeholder="شماره سفارش، موبایل یا خدمت" /></header>
            <div className={styles.tableWrap}><table><thead><tr><th>سفارش</th><th>کاربر</th><th>خدمت</th><th>مبلغ</th><th>وضعیت</th><th>تاریخ</th><th /></tr></thead><tbody>{filteredOrders.map((order)=><tr key={order.id}><td><strong dir="ltr">{order.order_no}</strong><small>{order.province||"—"}</small></td><td><strong>{order.dealer_name||order.full_name||"کاربر چاکود"}</strong><small>{maskMobile(order.mobile)}</small></td><td>{serviceTitleByKey[order.service_key] || order.service_key}</td><td><strong>{formatToman(order.total_amount_toman)}</strong>{Number(order.discount_amount_toman||0)>0&&<small>{order.discount_code} · {formatToman(order.discount_amount_toman)} تخفیف</small>}</td><td><span className={`${styles.status} ${styles[`status_${order.status}`]||""}`}>{statusLabels[order.status]||order.status}</span></td><td>{formatDate(order.created_at)}</td><td>{caps.orders_manage&&<div className={styles.rowActions}>{order.status!=="paid"&&<button onClick={()=>void patch({action:"update_order_status",order_id:order.id,status:"paid"},`order-${order.id}-paid`)}>پرداخت شد</button>}{order.status==="paid"&&<button className={styles.dangerButton} onClick={()=>void patch({action:"update_order_status",order_id:order.id,status:"refunded"},`order-${order.id}-refund`)}>بازگشت</button>}{order.status==="pending_payment"&&<button className={styles.lightButton} onClick={()=>void patch({action:"update_order_status",order_id:order.id,status:"cancelled"},`order-${order.id}-cancel`)}>لغو</button>}</div>}</td></tr>)}{filteredOrders.length===0&&<tr><td colSpan={7}><div className={styles.inlineEmpty}>سفارشی با این جست‌وجو پیدا نشد.</div></td></tr>}</tbody></table></div>
          </section>
        )}

        {activeTab === "subscriptions" && caps?.subscriptions_view && (
          <section className={styles.panel}>
            <header className={styles.panelHeader}><div><span>نمایش عمومی مجموعه‌ها</span><h2>اشتراک‌های حرفه‌ای</h2></div></header>
            <div className={styles.tableWrap}><table><thead><tr><th>مجموعه</th><th>پلن</th><th>وضعیت</th><th>شروع</th><th>پایان</th><th /></tr></thead><tbody>{(data.subscriptions||[]).map((subscription)=>{const draft=subscriptionDrafts[subscription.id]||subscription;return <tr key={subscription.id}><td><strong>{subscription.dealer_name}</strong><small>{subscription.business_type||"مجموعه حرفه‌ای"} · {maskMobile(subscription.mobile)}</small></td><td>{serviceTitleByKey[subscription.service_key] || subscription.service_key}</td><td><select value={draft.status} disabled={!caps.subscriptions_manage} onChange={(event)=>updateSubscriptionDraft(subscription.id,{status:event.target.value})}><option value="pending_payment">در انتظار پرداخت</option><option value="active">فعال</option><option value="expired">منقضی</option><option value="suspended">تعلیق</option><option value="cancelled">لغو</option></select></td><td><PersianDatePicker includeTime value={draft.starts_at} disabled={!caps.subscriptions_manage} onChange={(value)=>updateSubscriptionDraft(subscription.id,{starts_at:value})}/></td><td><PersianDatePicker includeTime value={draft.expires_at} disabled={!caps.subscriptions_manage} onChange={(value)=>updateSubscriptionDraft(subscription.id,{expires_at:value})}/></td><td>{caps.subscriptions_manage&&<button className={styles.tableButton} disabled={workingKey===`subscription-${subscription.id}`} onClick={()=>void patch({action:"update_subscription",subscription_id:subscription.id,status:draft.status,starts_at:draft.starts_at,expires_at:draft.expires_at},`subscription-${subscription.id}`)}>ذخیره</button>}</td></tr>})}{(data.subscriptions||[]).length===0&&<tr><td colSpan={6}><div className={styles.inlineEmpty}>اشتراک حرفه‌ای ثبت نشده است.</div></td></tr>}</tbody></table></div>
          </section>
        )}

        {activeTab === "admins" && caps?.admins_view && (
          <section className={styles.managementSection}>
            <header className={styles.sectionHeader}><div><span>تیم مدیریت سایت</span><h2>مدیران و سطح دسترسی</h2><p>فهرست مدیران را جدا از فرم دعوت مدیریت کنید.</p></div>{caps.admins_manage&&<button className={styles.primaryAction} onClick={()=>setManagerCreatorOpen((current)=>!current)}>{managerCreatorOpen?"بستن فرم":"افزودن مدیر"}</button>}</header>
            <div className={styles.adminGrid}>
            {caps.admins_manage && managerCreatorOpen && (
              <article className={`${styles.adminCard} ${styles.adminCreatorCard}`}>
                <header><div className={styles.adminAvatar}>+</div><div><h3>افزودن مدیر جدید</h3><span>دعوت با شماره موبایل</span></div></header>
                <div className={styles.twoCols}>
                  <label>نام نمایشی<input value={newAdmin.display_name} onChange={(event)=>setNewAdmin({...newAdmin,display_name:event.target.value})} placeholder="نام مدیر"/></label>
                  <label>شماره موبایل<input dir="ltr" value={newAdmin.mobile} onChange={(event)=>setNewAdmin({...newAdmin,mobile:event.target.value})} placeholder="09xxxxxxxxx"/></label>
                </div>
                <label>نقش<select value={newAdmin.role} onChange={(event)=>setNewAdmin({...newAdmin,role:event.target.value})}><option value="super_admin">مدیر کل</option><option value="admin">ادمین</option><option value="finance">مالی</option><option value="moderator">ناظر آگهی</option><option value="support">پشتیبانی</option><option value="viewer">فقط مشاهده</option></select></label>
                <div className={styles.permissionList}>{adminPermissions.map(([value,label])=><label key={value} className={newAdmin.permissions.includes(value)?styles.permissionOn:""}><input type="checkbox" checked={newAdmin.permissions.includes(value)} onChange={()=>toggleNewAdminPermission(value)}/><span>{label}</span></label>)}</div>
                <label className={styles.sensitiveToggle}><input type="checkbox" checked={newAdmin.can_view_sensitive_finance} onChange={(event)=>setNewAdmin({...newAdmin,can_view_sensitive_finance:event.target.checked})}/><span>مشاهده اطلاعات مالی حساس</span></label>
                <button disabled={workingKey==="admin-create"||newAdmin.mobile.trim().length<11} onClick={()=>void createAdmin()}>{workingKey==="admin-create"?"در حال ثبت...":"ثبت و دعوت مدیر"}</button>
              </article>
            )}
            {(data.admins || []).map((admin)=>{const draft=adminDrafts[admin.id]||admin;return <article className={styles.adminCard} key={admin.id}><header><div className={styles.adminAvatar}>م</div><div><h3>{admin.display_name||admin.full_name||"مدیر چاکود"}</h3><span>{maskMobile(admin.mobile||admin.invited_mobile)}</span></div></header><div className={styles.twoCols}><label>نقش<select value={draft.role} disabled={!caps.admins_manage} onChange={(event)=>updateAdminDraft(admin.id,{role:event.target.value})}><option value="super_admin">مدیر کل</option><option value="admin">ادمین</option><option value="finance">مالی</option><option value="moderator">ناظر آگهی</option><option value="support">پشتیبانی</option><option value="viewer">فقط مشاهده</option></select></label><label>وضعیت<select value={draft.status} disabled={!caps.admins_manage} onChange={(event)=>updateAdminDraft(admin.id,{status:event.target.value})}><option value="active">فعال</option><option value="disabled">غیرفعال</option><option value="removed">حذف</option></select></label></div><div className={styles.permissionList}>{adminPermissions.map(([value,label])=><label key={value} className={draft.permissions.includes(value)?styles.permissionOn:""}><input type="checkbox" checked={draft.permissions.includes(value)} disabled={!caps.admins_manage} onChange={()=>toggleAdminPermission(admin.id,value)}/><span>{label}</span></label>)}</div><label className={styles.sensitiveToggle}><input type="checkbox" checked={draft.can_view_sensitive_finance} disabled={!caps.admins_manage} onChange={(event)=>updateAdminDraft(admin.id,{can_view_sensitive_finance:event.target.checked})}/><span>مشاهده اطلاعات مالی حساس و شناسه‌های بانکی</span></label>{caps.admins_manage&&<button disabled={workingKey===`admin-${admin.id}`} onClick={()=>void patch({action:"update_admin_access",admin_id:admin.id,role:draft.role,status:draft.status,permissions:draft.permissions,can_view_sensitive_finance:draft.can_view_sensitive_finance},`admin-${admin.id}`)}>ذخیره دسترسی مدیر</button>}</article>})}
            {(data.admins || []).length===0&&!managerCreatorOpen&&<div className={styles.discountEmpty}><div>م</div><h3>مدیری ثبت نشده است</h3><p>برای افزودن اولین مدیر، روی «افزودن مدیر» بزنید.</p></div>}
            </div>
          </section>
        )}

            {activeTab === "audit" && caps?.audit_view && (
              <section className={styles.panel}><header><div><span>غیرقابل ویرایش</span><h2>گزارش فعالیت مدیران</h2></div></header><div className={styles.auditList}>{(data.audit||[]).length===0&&<div className={styles.inlineEmpty}>هنوز تغییر مدیریتی ثبت نشده است.</div>}{(data.audit||[]).map((item)=><article key={item.id}><div><strong>{item.display_name||"مدیر سیستم"}</strong><span>{auditActionLabels[item.action_key] || item.action_key}</span></div><p>{item.entity_type} #{item.entity_id}</p><small>{formatDate(item.created_at)} · {item.ip_address||"IP ثبت نشده"}</small></article>)}</div></section>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
