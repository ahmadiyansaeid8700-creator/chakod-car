// CHAKOD_SUBMIT_DEALER_ID_NORMALIZE_FIX_V1
// CHAKOD_SUBMIT_PENDING_REDIRECT_FIX_V1
"use client";

// CHAKOD_SUBMIT_COVER_PICKER_V5_ONE_CLICK
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = "https://api.chakod.com";

type User = {
  id?: number;
  mobile?: string;
  full_name?: string | null;
  account_type?: "personal" | "dealer" | "business";
  business_name?: string | null;
  display_name?: string;
};

type Dealer = {
  id: number;
  dealer_id?: number | string;
  auth_user_id?: number;
  dealer_name?: string;
  dealer_phone?: string;
  province?: string;
  city?: string;
  neighborhood?: string;
  address?: string;
  role?: string;
  is_verified?: boolean | number;
  is_active?: boolean | number;
};

type VehicleBrand = {
  id: number;
  code: string;
  name_fa: string;
  name_en?: string | null;
  country?: string | null;
  market_group?: string | null;
  sort_order?: number;
};

type VehicleModel = {
  id: number;
  brand_code: string;
  code: string;
  name_fa: string;
  name_en?: string | null;
  body_hint?: string | null;
  sort_order?: number;
};

type SaleStatus = {
  code: string;
  icon: string;
  title: string;
  subtitle: string;
  hint: string;
};

type ImageItem = {
  localId: string;
  file: File;
  previewUrl: string;
  status: "selected" | "uploading" | "uploaded" | "error" | "cancelled";
  progress: number;
  image_id?: number;
  image_url?: string;
  is_cover?: boolean;
  error?: string;
};

type PendingDetectedLocation = {
  province: string;
  city: string;
  neighborhood: string;
};

type SearchableVehicleOption = {
  value: string;
  label: string;
  secondary?: string;
  keywords?: string;
};

type SearchableVehicleSelectProps = {
  value: string;
  options: SearchableVehicleOption[];
  placeholder: string;
  emptyText: string;
  disabled?: boolean;
  loading?: boolean;
  onChange: (value: string) => void;
};

function normalizeVehicleSearch(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ۀة]/g, "ه")
    .replace(/[ؤ]/g, "و")
    .replace(/[إأ]/g, "ا")
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[\u200c\u200f\u202a-\u202e\s\-_/\\،,.]+/g, "");
}

function SearchableVehicleSelect({
  value,
  options,
  placeholder,
  emptyText,
  disabled = false,
  loading = false,
  onChange,
}: SearchableVehicleSelectProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const selectedOption = options.find((item) => item.value === value) || null;
  const normalizedQuery = normalizeVehicleSearch(query);

  const filteredOptions = options
    .filter((item) => {
      if (!normalizedQuery) return true;

      const haystack = normalizeVehicleSearch(
        [item.label, item.secondary, item.keywords, item.value]
          .filter(Boolean)
          .join(" "),
      );

      return haystack.includes(normalizedQuery);
    })
    .slice(0, 80);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        rootRef.current &&
        event.target instanceof Node &&
        !rootRef.current.contains(event.target)
      ) {
        setOpen(false);
        setQuery("");
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    if (highlightedIndex >= filteredOptions.length) {
      setHighlightedIndex(0);
    }
  }, [filteredOptions.length, highlightedIndex]);

  function openDropdown() {
    if (disabled) return;
    setOpen(true);
    setQuery("");
    setHighlightedIndex(0);

    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }

  function selectOption(option: SearchableVehicleOption) {
    onChange(option.value);
    setOpen(false);
    setQuery("");
    setHighlightedIndex(0);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;

    if (!open) {
      if (
        event.key === "Enter" ||
        event.key === "ArrowDown" ||
        event.key === " "
      ) {
        event.preventDefault();
        openDropdown();
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((current) =>
        filteredOptions.length === 0
          ? 0
          : (current + 1) % filteredOptions.length,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((current) =>
        filteredOptions.length === 0
          ? 0
          : (current - 1 + filteredOptions.length) % filteredOptions.length,
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      const option = filteredOptions[highlightedIndex];

      if (option) {
        selectOption(option);
      }

      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setQuery("");
    }
  }

  const inputValue = open ? query : selectedOption ? selectedOption.label : "";

  return (
    <div
      ref={rootRef}
      className={`vehicleSearchSelect ${open ? "open" : ""} ${
        disabled ? "disabled" : ""
      }`}
    >
      <div className="vehicleSearchInputWrap">
        <input
          ref={inputRef}
          className="vehicleSearchInput"
          value={inputValue}
          disabled={disabled}
          placeholder={loading ? "در حال دریافت..." : placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          onFocus={() => {
            if (!disabled) {
              setOpen(true);
              setQuery("");
              setHighlightedIndex(0);
            }
          }}
          onClick={() => {
            if (!disabled && !open) {
              openDropdown();
            }
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setHighlightedIndex(0);
          }}
          onKeyDown={handleKeyDown}
        />

        {value && !disabled && (
          <button
            type="button"
            className="vehicleSearchClear"
            aria-label="پاک کردن انتخاب"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onChange("");
              setQuery("");
              setOpen(false);
            }}
          >
            ×
          </button>
        )}

        <button
          type="button"
          className="vehicleSearchToggle"
          tabIndex={-1}
          disabled={disabled}
          aria-label={open ? "بستن فهرست" : "باز کردن فهرست"}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (open) {
              setOpen(false);
              setQuery("");
            } else {
              openDropdown();
            }
          }}
        >
          {open ? "⌃" : "⌄"}
        </button>
      </div>

      {selectedOption?.secondary && !open && (
        <div className="vehicleSearchSelectedMeta">
          {selectedOption.secondary}
        </div>
      )}

      {open && (
        <div className="vehicleSearchDropdown" role="listbox">
          {loading ? (
            <div className="vehicleSearchEmpty">در حال دریافت اطلاعات...</div>
          ) : filteredOptions.length === 0 ? (
            <div className="vehicleSearchEmpty">{emptyText}</div>
          ) : (
            filteredOptions.map((option, index) => {
              const active = option.value === value;
              const highlighted = index === highlightedIndex;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`vehicleSearchOption ${
                    active ? "selected" : ""
                  } ${highlighted ? "highlighted" : ""}`}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectOption(option)}
                >
                  <span className="vehicleSearchOptionText">
                    <strong>{option.label}</strong>
                    {option.secondary && <small>{option.secondary}</small>}
                  </span>

                  {active && <span className="vehicleSearchCheck">✓</span>}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

const saleStatuses: SaleStatus[] = [
  {
    code: "zero",
    icon: "🚘",
    title: "صفر و آماده تحویل",
    subtitle: "صفر کیلومتر، پلاک‌نشده یا آماده فروش",
    hint: "برای خودروهایی که هنوز کارکرد واقعی ندارند یا آماده تحویل فوری هستند.",
  },
  {
    code: "used",
    icon: "🚗",
    title: "کارکرده و کم‌کارکرد",
    subtitle: "کارکرده، تمیز، مصرفی یا کم‌کارکرد",
    hint: "رایج‌ترین حالت ثبت آگهی برای خودروهای شخصی و نمایشگاهی.",
  },
  {
    code: "preorder",
    icon: "🧾",
    title: "حواله و پیش‌فروش",
    subtitle: "ثبت‌نامی، حواله‌ای یا در انتظار تحویل",
    hint: "برای خودروهایی که هنوز تحویل قطعی نشده‌اند یا به شکل حواله معامله می‌شوند.",
  },
  {
    code: "freezone",
    icon: "🏝️",
    title: "منطقه آزاد",
    subtitle: "پلاک منطقه آزاد یا قابل استفاده در محدوده مجاز",
    hint: "برای خودروهای مخصوص مناطق آزاد، با شرایط و محدودیت‌های خاص همان منطقه.",
  },
  {
    code: "classic",
    icon: "🏁",
    title: "کلاسیک و کلکسیونی",
    subtitle: "قدیمی، کمیاب، خاص یا کلکسیونی",
    hint: "برای خودروهایی که ارزش خاص، تاریخی، احساسی یا کلکسیونی دارند.",
  },
];

const colors = [
  "سفید",
  "مشکی",
  "نقره‌ای",
  "نوک‌مدادی",
  "خاکستری",
  "آبی",
  "سرمه‌ای",
  "قرمز",
  "زرشکی",
  "قهوه‌ای",
  "بژ",
  "طلایی",
  "سبز",
  "زرد",
  "نارنجی",
  "کرم",
  "سفید صدفی",
  "مشکی متالیک",
  "سایر",
];

const persianYears = Array.from({ length: 86 }, (_, index) =>
  String(1405 - index),
);
const gregorianYears = Array.from({ length: 77 }, (_, index) =>
  String(2026 - index),
);

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("chakod_session_token") || "";
}

function isProfileComplete(user?: User | null) {
  if (!user) return false;

  const fullNameOk = Boolean(
    user.full_name && user.full_name.trim().length >= 2,
  );
  const type = user.account_type || "personal";

  if (!fullNameOk) return false;

  if (type === "dealer" || type === "business") {
    return Boolean(user.business_name && user.business_name.trim().length >= 2);
  }

  return true;
}

function toEnglishDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function cleanNumberInput(value: string) {
  return toEnglishDigits(value).replace(/[^\d]/g, "");
}

function formatNumber(value: string) {
  const clean = cleanNumberInput(value);
  if (!clean) return "";
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function makeLocalId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const MAX_IMAGE_COUNT = 10;
const MAX_SOURCE_IMAGE_SIZE = 20 * 1024 * 1024;
const MAX_UPLOAD_IMAGE_SIZE = 6 * 1024 * 1024;
const IMAGE_TARGET_SIZE = 1200 * 1024;

function formatFileSize(size: number) {
  if (size < 1024) return `${size} بایت`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} کیلوبایت`;
  return `${(size / (1024 * 1024)).toFixed(1)} مگابایت`;
}

function loadBrowserImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const sourceUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(sourceUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(sourceUrl);
      reject(new Error("این تصویر در مرورگر قابل پردازش نیست."));
    };

    image.src = sourceUrl;
  });
}

function canvasToWebp(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("فشرده‌سازی تصویر انجام نشد."));
          return;
        }

        resolve(blob);
      },
      "image/webp",
      quality,
    );
  });
}

async function optimizeImageForUpload(file: File): Promise<File> {
  const image = await loadBrowserImage(file);
  const originalWidth = Math.max(1, image.naturalWidth || image.width);
  const originalHeight = Math.max(1, image.naturalHeight || image.height);

  const attempts = [
    { maxEdge: 1600, quality: 0.78 },
    { maxEdge: 1450, quality: 0.72 },
    { maxEdge: 1280, quality: 0.66 },
  ];

  let output: Blob | null = null;

  for (const attempt of attempts) {
    const scale = Math.min(
      1,
      attempt.maxEdge / Math.max(originalWidth, originalHeight),
    );
    const width = Math.max(1, Math.round(originalWidth * scale));
    const height = Math.max(1, Math.round(originalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d", { alpha: false });

    if (!context) {
      throw new Error("مرورگر امکان بهینه‌سازی تصویر را ندارد.");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    output = await canvasToWebp(canvas, attempt.quality);

    if (output.size <= IMAGE_TARGET_SIZE) {
      break;
    }
  }

  if (!output) {
    throw new Error("فشرده‌سازی تصویر انجام نشد.");
  }

  if (output.size > MAX_UPLOAD_IMAGE_SIZE) {
    throw new Error("حجم تصویر حتی بعد از فشرده‌سازی بیشتر از حد مجاز است.");
  }

  const safeBaseName =
    file.name.replace(/\.[^.]+$/, "").replace(/[^\w\u0600-\u06FF-]+/g, "-") ||
    `chakod-${Date.now()}`;

  return new File([output], `${safeBaseName}.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}

function normalizeLocationName(value: string) {
  return value
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/^محله\s+/g, "")
    .replace(/محله/g, "")
    .replace(/\s+/g, "")
    .trim();
}

function findBestLocationMatch(list: string[], value: string) {
  const target = normalizeLocationName(value);

  if (!target) return "";

  const exact = list.find((item) => normalizeLocationName(item) === target);
  if (exact) return exact;

  const partial = list.find((item) => {
    const normalizedItem = normalizeLocationName(item);
    return normalizedItem.includes(target) || target.includes(normalizedItem);
  });

  return partial || "";
}

async function fetchGeo(params?: { province?: string; city?: string }) {
  const search = new URLSearchParams();

  if (params?.province) search.set("province", params.province);
  if (params?.city) search.set("city", params.city);

  const url = search.toString()
    ? `${API_BASE}/api/geo-locations.php?${search.toString()}`
    : `${API_BASE}/api/geo-locations.php`;

  const res = await fetch(url);
  const json = await res.json();

  return {
    success: Boolean(json.success),
    type: json.type || "",
    hasNeighborhoods: Boolean(json.has_neighborhoods),
    data: Array.isArray(json.data) ? (json.data as string[]) : [],
  };
}

function sortVehicleBrandsAlphabetically(items: VehicleBrand[]) {
  const collator = new Intl.Collator("fa", {
    usage: "sort",
    sensitivity: "base",
    numeric: true,
  });

  return [...items].sort((a, b) =>
    collator.compare(
      a.name_fa || a.name_en || a.code,
      b.name_fa || b.name_en || b.code,
    ),
  );
}

function sortVehicleModelsAlphabetically(items: VehicleModel[]) {
  const collator = new Intl.Collator("fa", {
    usage: "sort",
    sensitivity: "base",
    numeric: true,
  });

  return [...items].sort((a, b) => {
    const aIsOther = a.code === "other";
    const bIsOther = b.code === "other";

    if (aIsOther !== bIsOther) {
      return aIsOther ? 1 : -1;
    }

    return collator.compare(
      a.name_fa || a.name_en || a.code,
      b.name_fa || b.name_en || b.code,
    );
  });
}

async function fetchVehicleBrands() {
  const res = await fetch(`${API_BASE}/api/vehicle-catalog.php`);
  const json = await res.json();

  if (!json.success || !Array.isArray(json.data)) return [];

  return sortVehicleBrandsAlphabetically(json.data as VehicleBrand[]);
}

async function fetchVehicleModels(brandCode: string) {
  const res = await fetch(
    `${API_BASE}/api/vehicle-catalog.php?brand_code=${encodeURIComponent(brandCode)}`,
  );
  const json = await res.json();

  if (!json.success || !Array.isArray(json.data)) return [];

  return sortVehicleModelsAlphabetically(json.data as VehicleModel[]);
}

function uploadImageWithProgress(
  listingId: number,
  image: ImageItem,
  token: string,
  onProgress: (progress: number) => void,
  onRequestReady: (xhr: XMLHttpRequest) => void,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("POST", `${API_BASE}/api/upload-listing-image.php`);
    xhr.timeout = 120000;

    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.setRequestHeader("X-Session-Token", token);
    }

    onRequestReady(xhr);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      } else {
        onProgress(50);
      }
    };

    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText);
        resolve(json);
      } catch {
        reject(new Error("پاسخ سرور برای آپلود تصویر معتبر نبود."));
      }
    };

    xhr.onerror = () => {
      reject(new Error("ارتباط با سرور هنگام آپلود تصویر قطع شد."));
    };

    xhr.ontimeout = () => {
      reject(new Error("زمان آپلود تصویر بیش از حد طولانی شد."));
    };

    xhr.onabort = () => {
      reject(new DOMException("آپلود تصویر متوقف شد.", "AbortError"));
    };

    const formData = new FormData();
    formData.append("listing_id", String(listingId));
    formData.append("image", image.file);

    xhr.send(formData);
  });
}

export default function SubmitListingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [geoLoading, setGeoLoading] = useState(false);
  const [vehicleLoading, setVehicleLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [coverChangingId, setCoverChangingId] = useState<number | null>(null);
  const [deletingImageId, setDeletingImageId] = useState<number | null>(null);
  const [locationDetecting, setLocationDetecting] = useState(false);

  const activeUploadsRef = useRef<Map<string, XMLHttpRequest>>(new Map());
  const stopAllUploadsRef = useRef(false);

  const [loggedIn, setLoggedIn] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [listingOwnerType, setListingOwnerType] = useState<
    "personal" | "dealer"
  >("personal");
  const [selectedDealerId, setSelectedDealerId] = useState("");

  const [categoryCode, setCategoryCode] = useState("used");

  const [vehicleBrands, setVehicleBrands] = useState<VehicleBrand[]>([]);
  const [vehicleModels, setVehicleModels] = useState<VehicleModel[]>([]);

  const [vehicleBrandCode, setVehicleBrandCode] = useState("");
  const [vehicleModelCode, setVehicleModelCode] = useState("");
  const [vehicleCustomModelName, setVehicleCustomModelName] = useState("");

  const [title, setTitle] = useState("");
  const [productionYear, setProductionYear] = useState("");
  const [mileageKm, setMileageKm] = useState("");
  const [priceToman, setPriceToman] = useState("");

  const [provinces, setProvinces] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [cityHasNeighborhoods, setCityHasNeighborhoods] = useState(false);

  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");

  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [locationAccuracy, setLocationAccuracy] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [locationSource, setLocationSource] = useState("");
  const [pendingDetectedLocation, setPendingDetectedLocation] =
    useState<PendingDetectedLocation | null>(null);

  const [color, setColor] = useState("");
  const [bodyStatus, setBodyStatus] = useState("سالم");
  const [transmission, setTransmission] = useState("اتوماتیک");
  const [fuelType, setFuelType] = useState("بنزین");
  const [description, setDescription] = useState("");

  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedCoverLocalId, setSelectedCoverLocalId] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [imageMessage, setImageMessage] = useState("");
  const [imageError, setImageError] = useState("");
  const [locationMessage, setLocationMessage] = useState("");
  const [locationError, setLocationError] = useState("");
  const [createdListingId, setCreatedListingId] = useState<number | null>(null);
  const [activeStep, setActiveStep] = useState(1);
  const [maxVisitedStep, setMaxVisitedStep] = useState(1);
  const [stepError, setStepError] = useState("");

  const selectedBrand =
    vehicleBrands.find((item) => item.code === vehicleBrandCode) || null;
  const selectedModel =
    vehicleModels.find((item) => item.code === vehicleModelCode) || null;

  const brandName = selectedBrand?.name_fa || "";
  const modelName =
    selectedModel?.code === "other"
      ? vehicleCustomModelName.trim()
      : selectedModel?.name_fa || "";

  useEffect(() => {
    return () => {
      activeUploadsRef.current.forEach((xhr) => xhr.abort());
      activeUploadsRef.current.clear();
    };
  }, []);

  async function loadDealers() {
    const token = getToken();

    try {
      const res = await fetch(`${API_BASE}/api/my-dealers.php`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const json = await res.json();

      if (json.success && Array.isArray(json.data)) {
        const rawDealers = json.data as Record<string, unknown>[];
        const normalizedDealers: Dealer[] = rawDealers
          .map((item): Dealer => {
            const id = Number(item.id ?? item.dealer_id ?? 0);
            const dealerName = String(
              item.dealer_name ?? item.name ?? item.title ?? "",
            ).trim();

            return {
              ...item,
              id,
              dealer_id: item.dealer_id as number | string | undefined,
              dealer_name: dealerName || undefined,
            } as Dealer;
          })
          .filter((dealer) => Number.isInteger(dealer.id) && dealer.id > 0)
          .filter(
            (dealer) =>
              dealer.is_active !== false && Number(dealer.is_active) !== 0,
          );

        setDealers(normalizedDealers);
      } else {
        setDealers([]);
      }
    } catch {
      setDealers([]);
    }
  }

  useEffect(() => {
    async function boot() {
      setLoading(true);
      setError("");

      try {
        const token = getToken();

        const meRes = await fetch(`${API_BASE}/api/me.php`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const meJson = await meRes.json();

        if (meJson.success && meJson.logged_in && meJson.user) {
          setLoggedIn(true);
          setUser(meJson.user);
          setProfileComplete(isProfileComplete(meJson.user));
          localStorage.setItem("chakod_user", JSON.stringify(meJson.user));
          await loadDealers();
        } else {
          setLoggedIn(false);
          setUser(null);
          setProfileComplete(false);
        }
      } catch {
        setLoggedIn(false);
        setUser(null);
        setProfileComplete(false);
      }

      try {
        const result = await fetchGeo();
        setProvinces(result.data);
      } catch {
        setProvinces([]);
      }

      try {
        const brands = await fetchVehicleBrands();
        setVehicleBrands(brands);
      } catch {
        setVehicleBrands([]);
      }

      setLoading(false);
    }

    boot();
  }, []);

  useEffect(() => {
    if (listingOwnerType === "dealer" && dealers.length === 0) {
      setListingOwnerType("personal");
      setSelectedDealerId("");
      return;
    }

    if (selectedDealerId) {
      const exists = dealers.some(
        (dealer) => String(dealer.id) === selectedDealerId,
      );

      if (!exists) {
        setSelectedDealerId("");
      }
    }
  }, [dealers, listingOwnerType, selectedDealerId]);

  useEffect(() => {
    async function loadCities() {
      if (!province) {
        setCities([]);
        setCity("");
        setNeighborhoods([]);
        setNeighborhood("");
        setCityHasNeighborhoods(false);
        return;
      }

      const pending = pendingDetectedLocation;

      setGeoLoading(true);
      setCities([]);
      setCity("");
      setNeighborhoods([]);
      setNeighborhood("");
      setCityHasNeighborhoods(false);

      try {
        const result = await fetchGeo({ province });
        setCities(result.data);

        if (pending && pending.province === province && pending.city) {
          const matchedCity = findBestLocationMatch(result.data, pending.city);

          if (matchedCity) {
            setCity(matchedCity);
          }
        }
      } catch {
        setCities([]);
      } finally {
        setGeoLoading(false);
      }
    }

    loadCities();
  }, [province]);

  useEffect(() => {
    async function loadNeighborhoods() {
      if (!province || !city) {
        setNeighborhoods([]);
        setNeighborhood("");
        setCityHasNeighborhoods(false);
        return;
      }

      const pending = pendingDetectedLocation;

      setGeoLoading(true);
      setNeighborhoods([]);
      setNeighborhood("");
      setCityHasNeighborhoods(false);

      try {
        const result = await fetchGeo({ province, city });
        const hasNeighborhoods =
          result.hasNeighborhoods && result.data.length > 0;

        setNeighborhoods(result.data);
        setCityHasNeighborhoods(hasNeighborhoods);

        if (pending && pending.province === province && pending.city) {
          if (hasNeighborhoods && pending.neighborhood) {
            const matchedNeighborhood = findBestLocationMatch(
              result.data,
              pending.neighborhood,
            );

            if (matchedNeighborhood) {
              setNeighborhood(matchedNeighborhood);
            }
          }

          setPendingDetectedLocation(null);
        }
      } catch {
        setNeighborhoods([]);
        setCityHasNeighborhoods(false);
      } finally {
        setGeoLoading(false);
      }
    }

    loadNeighborhoods();
  }, [province, city]);

  useEffect(() => {
    async function loadModels() {
      if (!vehicleBrandCode) {
        setVehicleModels([]);
        setVehicleModelCode("");
        setVehicleCustomModelName("");
        return;
      }

      setVehicleLoading(true);
      setVehicleModels([]);
      setVehicleModelCode("");
      setVehicleCustomModelName("");

      try {
        const models = await fetchVehicleModels(vehicleBrandCode);
        setVehicleModels(models);
      } catch {
        setVehicleModels([]);
      } finally {
        setVehicleLoading(false);
      }
    }

    loadModels();
  }, [vehicleBrandCode]);

  async function detectCurrentLocation() {
    setLocationMessage("");
    setLocationError("");

    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocationError("مرورگر شما امکان تشخیص موقعیت را پشتیبانی نمی‌کند.");
      return;
    }

    setLocationDetecting(true);

    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 15000,
            maximumAge: 60000,
          });
        },
      );

      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      const accuracy = Math.round(position.coords.accuracy || 0);

      const res = await fetch(
        `${API_BASE}/api/location-reverse.php?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`,
      );

      const json = await res.json();

      if (!json.success) {
        setLocationError(json.message || "تشخیص موقعیت انجام نشد.");
        return;
      }

      const detectedProvince = String(json.province || "").trim();
      const detectedCity = String(json.city || "").trim();
      const detectedNeighborhood = String(json.neighborhood || "").trim();
      const compactLabel = String(
        json.address_compact || json.address || "",
      ).trim();

      setLatitude(String(lat));
      setLongitude(String(lon));
      setLocationAccuracy(String(accuracy));
      setLocationSource("mapir");
      setLocationLabel(compactLabel || "موقعیت حدودی انتخاب شد");

      if (detectedProvince) {
        setPendingDetectedLocation({
          province: detectedProvince,
          city: detectedCity,
          neighborhood: detectedNeighborhood,
        });

        const matchedProvince =
          findBestLocationMatch(provinces, detectedProvince) ||
          detectedProvince;
        setProvince(matchedProvince);
      }

      setLocationMessage(
        compactLabel
          ? `موقعیت حدودی تشخیص داده شد: ${compactLabel}`
          : "موقعیت حدودی شما تشخیص داده شد.",
      );
    } catch {
      setLocationError("اجازه موقعیت داده نشد یا تشخیص موقعیت انجام نشد.");
    } finally {
      setLocationDetecting(false);
    }
  }

  async function handleImageSelect(files: FileList | null) {
    setImageMessage("");
    setImageError("");

    if (!files || files.length === 0) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const availableSlots = MAX_IMAGE_COUNT - images.length;

    if (availableSlots <= 0) {
      setImageError("برای هر آگهی حداکثر ۱۰ تصویر قابل ثبت است.");
      return;
    }

    const incoming = Array.from(files).slice(0, availableSlots);
    const validItems: ImageItem[] = [];
    const errors: string[] = [];

    setImageProcessing(true);
    setImageMessage("در حال کم‌حجم‌کردن و آماده‌سازی تصاویر...");

    try {
      for (const file of incoming) {
        if (!allowedTypes.includes(file.type)) {
          errors.push(`${file.name}: فرمت تصویر باید JPG، PNG یا WEBP باشد.`);
          continue;
        }

        if (file.size > MAX_SOURCE_IMAGE_SIZE) {
          errors.push(`${file.name}: حجم فایل اولیه بیشتر از ۲۰ مگابایت است.`);
          continue;
        }

        try {
          const optimizedFile = await optimizeImageForUpload(file);

          validItems.push({
            localId: makeLocalId(),
            file: optimizedFile,
            previewUrl: URL.createObjectURL(optimizedFile),
            status: "selected",
            progress: 0,
          });
        } catch (err) {
          errors.push(
            `${file.name}: ${
              err instanceof Error ? err.message : "آماده‌سازی تصویر انجام نشد."
            }`,
          );
        }
      }

      if (validItems.length > 0) {
        setImages((prev) => [...prev, ...validItems]);
        setSelectedCoverLocalId((current) => current || validItems[0].localId);
        setImageMessage(
          `${validItems.length} تصویر به WEBP تبدیل و برای آپلود آماده شد. تصویر اول به‌عنوان عکس اصلی انتخاب شد.`,
        );
      } else {
        setImageMessage("");
      }

      if (errors.length > 0) {
        setImageError(errors.join(" "));
      }
    } finally {
      setImageProcessing(false);
    }
  }

  function stopImageUpload(localId: string) {
    const xhr = activeUploadsRef.current.get(localId);

    if (xhr) {
      xhr.abort();
      activeUploadsRef.current.delete(localId);
    }

    setImages((prev) =>
      prev.map((item) =>
        item.localId === localId
          ? {
              ...item,
              status: "cancelled",
              progress: 0,
              error: "آپلود توسط کاربر متوقف شد.",
            }
          : item,
      ),
    );

    setImageMessage("آپلود تصویر متوقف شد.");
  }

  function stopAllImageUploads() {
    stopAllUploadsRef.current = true;

    activeUploadsRef.current.forEach((xhr) => xhr.abort());
    activeUploadsRef.current.clear();

    setImages((prev) =>
      prev.map((item) =>
        item.status === "uploading"
          ? {
              ...item,
              status: "cancelled",
              progress: 0,
              error: "آپلود توسط کاربر متوقف شد.",
            }
          : item,
      ),
    );

    setImageMessage("آپلود تصاویر متوقف شد.");
  }

  function removeLocalImage(localId: string) {
    const xhr = activeUploadsRef.current.get(localId);

    if (xhr) {
      xhr.abort();
      activeUploadsRef.current.delete(localId);
    }

    setImages((prev) => {
      const found = prev.find((item) => item.localId === localId);
      const remaining = prev.filter((item) => item.localId !== localId);

      if (found) {
        URL.revokeObjectURL(found.previewUrl);
      }

      if (selectedCoverLocalId === localId) {
        setSelectedCoverLocalId(remaining[0]?.localId || null);
      }

      return remaining;
    });
  }

  function selectLocalCover(localId: string) {
    setSelectedCoverLocalId(localId);
    setImageError("");
    setImageMessage("این تصویر به‌عنوان عکس اصلی انتخاب شد.");
  }

  async function uploadAllImages(listingId: number, onlyLocalIds?: string[]) {
    const token = getToken();
    const retryableStatuses: ImageItem["status"][] = [
      "selected",
      "error",
      "cancelled",
    ];

    const preferredCoverLocalId =
      selectedCoverLocalId || images[0]?.localId || null;

    const pendingImages = images
      .filter(
        (item) =>
          retryableStatuses.includes(item.status) &&
          (!onlyLocalIds || onlyLocalIds.includes(item.localId)),
      )
      .sort((a, b) => {
        if (a.localId === preferredCoverLocalId) return -1;
        if (b.localId === preferredCoverLocalId) return 1;
        return 0;
      });

    if (pendingImages.length === 0) {
      return { uploaded: 0, failed: 0, cancelled: 0 };
    }

    stopAllUploadsRef.current = false;
    setUploadingImages(true);
    setImageMessage("");
    setImageError("");

    let uploaded = 0;
    let failed = 0;
    let cancelled = 0;
    let preferredCoverImageId =
      images.find(
        (item) =>
          item.localId === preferredCoverLocalId &&
          item.status === "uploaded" &&
          item.image_id,
      )?.image_id || 0;

    try {
      for (const image of pendingImages) {
        if (stopAllUploadsRef.current) {
          break;
        }

        setImages((prev) =>
          prev.map((item) =>
            item.localId === image.localId
              ? { ...item, status: "uploading", progress: 5, error: "" }
              : item,
          ),
        );

        try {
          const json = await uploadImageWithProgress(
            listingId,
            image,
            token,
            (progress) => {
              setImages((prev) =>
                prev.map((item) =>
                  item.localId === image.localId
                    ? {
                        ...item,
                        progress: Math.max(5, Math.min(progress, 99)),
                      }
                    : item,
                ),
              );
            },
            (xhr) => {
              activeUploadsRef.current.set(image.localId, xhr);
            },
          );

          if (json.success && json.image_url) {
            uploaded += 1;

            const uploadedImageId = Number(json.image_id || 0) || undefined;

            if (
              image.localId === preferredCoverLocalId &&
              uploadedImageId
            ) {
              preferredCoverImageId = uploadedImageId;
            }

            setImages((prev) =>
              prev.map((item) =>
                item.localId === image.localId
                  ? {
                      ...item,
                      status: "uploaded",
                      progress: 100,
                      image_id: uploadedImageId,
                      image_url: json.image_url,
                      is_cover:
                        Boolean(json.is_cover) ||
                        item.localId === preferredCoverLocalId,
                      error: "",
                    }
                  : item,
              ),
            );
          } else {
            failed += 1;

            setImages((prev) =>
              prev.map((item) =>
                item.localId === image.localId
                  ? {
                      ...item,
                      status: "error",
                      progress: 0,
                      error: json.message || "آپلود تصویر انجام نشد.",
                    }
                  : item,
              ),
            );
          }
        } catch (err) {
          const wasCancelled =
            err instanceof DOMException && err.name === "AbortError";

          if (wasCancelled) {
            cancelled += 1;

            setImages((prev) =>
              prev.map((item) =>
                item.localId === image.localId
                  ? {
                      ...item,
                      status: "cancelled",
                      progress: 0,
                      error: "آپلود توسط کاربر متوقف شد.",
                    }
                  : item,
              ),
            );
          } else {
            failed += 1;

            setImages((prev) =>
              prev.map((item) =>
                item.localId === image.localId
                  ? {
                      ...item,
                      status: "error",
                      progress: 0,
                      error:
                        err instanceof Error
                          ? err.message
                          : "آپلود تصویر انجام نشد.",
                    }
                  : item,
              ),
            );
          }
        } finally {
          activeUploadsRef.current.delete(image.localId);
        }
      }
    } finally {
      setUploadingImages(false);
      stopAllUploadsRef.current = false;
    }

    if (preferredCoverImageId && preferredCoverLocalId) {
      try {
        await setCoverImageForListing(
          listingId,
          preferredCoverImageId,
          preferredCoverLocalId,
          false,
        );
      } catch {
        setImageError(
          "تصاویر آپلود شدند، اما انتخاب عکس اصلی روی سرور ذخیره نشد. دوباره روی دکمه «انتخاب عکس اصلی» بزنید.",
        );
      }
    }

    return { uploaded, failed, cancelled };
  }

  async function finalizeListing(listingId: number) {
    const token = getToken();

    const res = await fetch(`${API_BASE}/api/finalize-listing.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token
          ? {
              Authorization: `Bearer ${token}`,
              "X-Session-Token": token,
            }
          : {}),
      },
      body: JSON.stringify({
        listing_id: listingId,
      }),
    });

    const json = await res.json();

    if (!json.success) {
      throw new Error(
        json.message || "بررسی نهایی هوشمند آگهی انجام نشد.",
      );
    }

    return json;
  }

  async function retryOneImage(localId: string) {
    if (!createdListingId || uploadingImages) return;

    const result = await uploadAllImages(createdListingId, [localId]);

    if (result.failed > 0) {
      setImageError("این تصویر دوباره آپلود نشد.");
    } else if (result.cancelled === 0) {
      setImageError("");
      setImageMessage("تصویر با موفقیت آپلود شد.");
    }
  }

  async function deleteUploadedImage(item: ImageItem) {
    if (!createdListingId || !item.image_id || deletingImageId) return;

    setDeletingImageId(item.image_id);
    setImageMessage("");
    setImageError("");

    try {
      const token = getToken();

      const res = await fetch(`${API_BASE}/api/delete-listing-image.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token
            ? {
                Authorization: `Bearer ${token}`,
                "X-Session-Token": token,
              }
            : {}),
        },
        body: JSON.stringify({
          listing_id: createdListingId,
          image_id: item.image_id,
        }),
      });

      const json = await res.json();

      if (!json.success) {
        setImageError(json.message || "حذف تصویر انجام نشد.");
        return;
      }

      const nextCoverId = Number(json.new_cover_image_id || 0);
      const remainingSnapshot = images.filter(
        (image) => image.localId !== item.localId,
      );
      const nextSelectedCover =
        remainingSnapshot.find((image) => image.image_id === nextCoverId)
          ?.localId ||
        (selectedCoverLocalId === item.localId
          ? remainingSnapshot[0]?.localId
          : selectedCoverLocalId) ||
        remainingSnapshot[0]?.localId ||
        null;

      setSelectedCoverLocalId(nextSelectedCover);

      setImages((prev) => {
        const remaining = prev.filter(
          (image) => image.localId !== item.localId,
        );

        URL.revokeObjectURL(item.previewUrl);

        if (nextCoverId > 0) {
          return remaining.map((image) => ({
            ...image,
            is_cover: image.image_id === nextCoverId,
          }));
        }

        if (item.is_cover) {
          let coverAssigned = false;

          return remaining.map((image) => {
            if (!coverAssigned && image.status === "uploaded") {
              coverAssigned = true;
              return { ...image, is_cover: true };
            }

            return { ...image, is_cover: false };
          });
        }

        return remaining;
      });

      setImageMessage("تصویر از آگهی حذف شد.");
    } catch {
      setImageError("ارتباط با سرور برای حذف تصویر برقرار نشد.");
    } finally {
      setDeletingImageId(null);
    }
  }

  function removeImage(localId: string) {
    const item = images.find((image) => image.localId === localId);

    if (!item) return;

    if (item.status === "uploaded") {
      void deleteUploadedImage(item);
      return;
    }

    removeLocalImage(localId);
  }

  async function submitListing() {
    setSubmitting(true);
    setMessage("");
    setError("");
    setImageMessage("");
    setImageError("");

    try {
      const token = getToken();

      const res = await fetch(`${API_BASE}/api/submit-listing.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          listing_owner_type: listingOwnerType,
          dealer_id:
            listingOwnerType === "dealer" ? Number(selectedDealerId) : null,

          category_code: categoryCode,

          vehicle_market_level: "standard",
          vehicle_body_type: selectedModel?.body_hint || "",

          vehicle_brand_code: vehicleBrandCode,
          vehicle_model_code: vehicleModelCode,
          vehicle_trim_code: "",
          vehicle_custom_model_name:
            vehicleModelCode === "other" ? vehicleCustomModelName : "",

          brand: brandName,
          model: modelName,
          trim_name: "",

          title,
          production_year: productionYear,
          mileage_km: mileageKm,
          price_toman: priceToman,

          province,
          city,
          neighborhood: cityHasNeighborhoods ? neighborhood : "",

          latitude,
          longitude,
          location_accuracy_m: locationAccuracy,
          location_label: locationLabel,
          location_source: locationSource,

          color,
          body_status: bodyStatus,
          transmission,
          fuel_type: fuelType,
          description,
        }),
      });

      const json = await res.json();

      if (!json.success) {
        setError(json.message || "ثبت آگهی انجام نشد.");
        return;
      }

      const listingId = Number(json.listing_id || 0);
      setCreatedListingId(listingId);

      if (listingId > 0 && images.length > 0) {
        const result = await uploadAllImages(listingId);

        if (result.failed > 0 || result.cancelled > 0) {
          if (result.failed > 0) {
            setImageError(
              `${result.failed} تصویر آپلود نشد. می‌توانید دوباره تلاش کنید یا آن را حذف کنید.`,
            );
          }

          setMessage(
            result.cancelled > 0
              ? "آگهی ثبت شد، اما آپلود بعضی تصاویر متوقف شد."
              : "آگهی ثبت شد، اما بعضی تصاویر آپلود نشدند.",
          );
        } else {
          setImageMessage("تصاویر با موفقیت آپلود شدند.");

          try {
            const finalReview = await finalizeListing(listingId);

            const isPublished =
              finalReview.published === true ||
              finalReview.published === 1 ||
              finalReview.published === "1" ||
              finalReview.published === "true";

            if (isPublished) {
              setMessage(
                "آگهی توسط موتور هوشمند چاکود تأیید و منتشر شد.",
              );
            } else {
              setMessage(
                "آگهی ثبت شد و برای بررسی دقیق‌تر به مدیر چاکود ارسال شد.",
              );
            }

            setTimeout(() => {
              router.push(
                isPublished
                  ? `/cars/${listingId}`
                  : `/account/listings/${listingId}`,
              );
            }, 1800);
          } catch (finalizeError) {
            setMessage(
              "آگهی و تصاویر ثبت شدند؛ بررسی نهایی در صف چاکود قرار گرفت.",
            );
            setImageError(
              finalizeError instanceof Error
                ? finalizeError.message
                : "بررسی نهایی هوشمند انجام نشد.",
            );
          }
        }
      } else {
        setMessage("آگهی ثبت شد، اما هنوز تصویری برای آن آپلود نشده است.");
      }
    } catch {
      setError("ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.");
    } finally {
      setSubmitting(false);
      setUploadingImages(false);
    }
  }

  async function retryFailedImages() {
    if (!createdListingId || uploadingImages) return;

    const result = await uploadAllImages(createdListingId);

    if (result.failed > 0) {
      setImageError(`${result.failed} تصویر هنوز آپلود نشد.`);
      return;
    }

    if (result.cancelled > 0) {
      setImageMessage("آپلود بعضی تصاویر متوقف شد.");
      return;
    }

    setImageError("");
    setImageMessage("تصاویر باقی‌مانده با موفقیت آپلود شدند.");

    try {
      const finalReview = await finalizeListing(createdListingId);

      const isPublished =
        finalReview.published === true ||
        finalReview.published === 1 ||
        finalReview.published === "1" ||
        finalReview.published === "true";

      setMessage(
        isPublished
          ? "آگهی توسط موتور هوشمند چاکود تأیید و منتشر شد."
          : "آگهی برای بررسی دقیق‌تر به مدیر چاکود ارسال شد.",
      );

      setTimeout(() => {
        router.push(
          isPublished
            ? `/cars/${createdListingId}`
            : `/account/listings/${createdListingId}`,
        );
      }, 1800);
    } catch (finalizeError) {
      setImageError(
        finalizeError instanceof Error
          ? finalizeError.message
          : "بررسی نهایی هوشمند انجام نشد.",
      );
    }
  }

  async function setCoverImageForListing(
    listingId: number,
    imageId: number,
    localId: string,
    announce = true,
  ) {
    const token = getToken();

    const res = await fetch(`${API_BASE}/api/set-listing-cover-image.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token
          ? {
              Authorization: `Bearer ${token}`,
              "X-Session-Token": token,
            }
          : {}),
      },
      body: JSON.stringify({
        listing_id: listingId,
        image_id: imageId,
      }),
    });

    const json = await res.json();

    if (!json.success) {
      throw new Error(json.message || "تغییر عکس اصلی انجام نشد.");
    }

    setSelectedCoverLocalId(localId);
    setImages((prev) =>
      prev.map((item) => ({
        ...item,
        is_cover: item.image_id === imageId,
      })),
    );

    if (announce) {
      setImageMessage("عکس اصلی آگهی تغییر کرد.");
    }
  }

  async function chooseCoverImage(item: ImageItem) {
    if (item.status === "uploading" || coverChangingId) return;

    if (!createdListingId || item.status !== "uploaded" || !item.image_id) {
      selectLocalCover(item.localId);
      return;
    }

    setCoverChangingId(item.image_id);
    setImageMessage("");
    setImageError("");

    try {
      await setCoverImageForListing(
        createdListingId,
        item.image_id,
        item.localId,
      );
    } catch (err) {
      setImageError(
        err instanceof Error
          ? err.message
          : "ارتباط با سرور برای تغییر عکس اصلی برقرار نشد.",
      );
    } finally {
      setCoverChangingId(null);
    }
  }

  const customModelOk =
    vehicleModelCode !== "other" || vehicleCustomModelName.trim().length >= 2;

  const neighborhoodOk =
    !cityHasNeighborhoods || neighborhood.trim().length >= 2;

  const ownerOk =
    listingOwnerType === "personal" || Number(selectedDealerId) > 0;

  const canSubmit =
    ownerOk &&
    title.trim().length >= 5 &&
    vehicleBrandCode.trim().length >= 1 &&
    vehicleModelCode.trim().length >= 1 &&
    customModelOk &&
    productionYear.trim().length >= 4 &&
    province.trim().length >= 2 &&
    city.trim().length >= 2 &&
    neighborhoodOk &&
    loggedIn &&
    profileComplete;

  const formSteps = [
    { id: 1, title: "صاحب آگهی", shortTitle: "مالک" },
    { id: 2, title: "نوع فروش", shortTitle: "مسیر" },
    { id: 3, title: "خودرو", shortTitle: "خودرو" },
    { id: 4, title: "اطلاعات اصلی", shortTitle: "اطلاعات" },
    { id: 5, title: "وضعیت خودرو", shortTitle: "وضعیت" },
    { id: 6, title: "موقعیت", shortTitle: "موقعیت" },
    { id: 7, title: "تصاویر و ثبت", shortTitle: "تصاویر" },
  ];

  function isStepValid(step: number) {
    if (step === 1) return ownerOk;
    if (step === 2) return Boolean(categoryCode);
    if (step === 3) {
      return (
        vehicleBrandCode.trim().length > 0 &&
        vehicleModelCode.trim().length > 0 &&
        customModelOk
      );
    }
    if (step === 4) {
      return title.trim().length >= 5 && productionYear.trim().length >= 4;
    }
    if (step === 5) return true;
    if (step === 6) {
      return (
        province.trim().length >= 2 &&
        city.trim().length >= 2 &&
        neighborhoodOk
      );
    }
    return canSubmit;
  }

  function stepErrorText(step: number) {
    if (step === 1) return "صاحب آگهی را مشخص کنید.";
    if (step === 2) return "نوع فروش خودرو را انتخاب کنید.";
    if (step === 3) return "برند و مدل خودرو را کامل انتخاب کنید.";
    if (step === 4) return "عنوان آگهی و سال تولید را کامل وارد کنید.";
    if (step === 6) return "استان، شهر و در صورت نیاز محله را کامل انتخاب کنید.";
    return "اطلاعات لازم این مرحله را کامل کنید.";
  }

  function changeStep(nextStep: number) {
    const safeStep = Math.max(1, Math.min(7, nextStep));

    if (safeStep > activeStep && !isStepValid(activeStep)) {
      setStepError(stepErrorText(activeStep));
      return;
    }

    setStepError("");
    setActiveStep(safeStep);
    setMaxVisitedStep((current) => Math.max(current, safeStep));

    window.setTimeout(() => {
      document
        .querySelector(".wizardProgressCard")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  const activeStepTitle =
    formSteps.find((step) => step.id === activeStep)?.title || "ثبت آگهی";
  const progressPercent = Math.round((activeStep / formSteps.length) * 100);
  const selectedCategoryTitle =
    saleStatuses.find((item) => item.code === categoryCode)?.title || "انتخاب نشده";
  const selectedOwnerTitle =
    listingOwnerType === "dealer"
      ? dealers.find((dealer) => String(dealer.id) === selectedDealerId)?.dealer_name ||
        "نمایشگاه"
      : user?.display_name || user?.full_name || "آگهی شخصی";

  const imageCount = images.length;
  const hasRetryableImages = images.some(
    (item) =>
      item.status === "selected" ||
      item.status === "error" ||
      item.status === "cancelled",
  );

  return (
    <main className="submitPage" dir="rtl">
      <section className="shell">
        <div className="topbar">
          <a href="/" className="brand" aria-label="چاکود">
            <img
              className="brandLogo"
              src="/brand/chakod-logo-horizontal.png"
              alt="چاکود"
              onError={(event) => {
                event.currentTarget.src = "/brand/chakod-symbol.png";
              }}
            />
          </a>

          <div className="navLinks">
            <a href="/">صفحه اصلی</a>
            <a href="/dealers">نمایشگاه من</a>
          </div>
        </div>

        {loading && (
          <div className="card centerCard">
            <div className="loader" />
            <h1>در حال آماده‌سازی فرم...</h1>
            <p>چند لحظه صبر کنید.</p>
          </div>
        )}

        {!loading && !loggedIn && (
          <div className="card centerCard">
            <span className="miniLabel">ثبت آگهی</span>
            <h1>برای ثبت آگهی وارد شوید</h1>
            <p>ثبت آگهی در چاکود فقط برای کاربران واردشده امکان‌پذیر است.</p>
            <a className="primaryLink" href="/login">
              ورود با شماره موبایل
            </a>
          </div>
        )}

        {!loading && loggedIn && !profileComplete && (
          <div className="card centerCard">
            <span className="miniLabel">تکمیل حساب</span>
            <h1>اول پروفایل را تکمیل کنید</h1>
            <p>
              برای اینکه آگهی به نام درست ثبت شود، ابتدا فقط یک بار نام و نوع
              حساب خود را وارد کنید.
            </p>
            <a className="primaryLink" href="/account?complete=1">
              تکمیل پروفایل
            </a>
          </div>
        )}

        {!loading && loggedIn && profileComplete && (
          <>
            <div className="heroCard submitHero">
              <div>
                <span className="miniLabel">ثبت حرفه‌ای خودرو</span>
                <h1>آگهی را کوتاه، دقیق و مرحله‌ای بساز</h1>
                <p>
                  سلام، {user?.display_name || "همراه چاکود"}. اطلاعات هر مرحله
                  جدا ذخیره می‌شود تا بدون شلوغی، آگهی کامل و قابل‌اعتماد بسازید.
                </p>
              </div>

              <div className="heroTrust">
                <span>بررسی ساختاریافته</span>
                <span>آپلود هوشمند تصویر</span>
                <span>نمایش حرفه‌ای</span>
              </div>
            </div>

            <section className="wizardProgressCard" aria-label="مراحل ثبت آگهی">
              <div className="wizardProgressTop">
                <div>
                  <span>مرحله {activeStep} از {formSteps.length}</span>
                  <strong>{activeStepTitle}</strong>
                </div>
                <em>{progressPercent}% تکمیل</em>
              </div>

              <div className="progressTrackMain" aria-hidden="true">
                <span style={{ width: `${progressPercent}%` }} />
              </div>

              <div className="stepRail">
                {formSteps.map((step) => {
                  const completed = step.id < activeStep && isStepValid(step.id);
                  const available =
                    step.id <= maxVisitedStep || step.id <= activeStep + 1;

                  return (
                    <button
                      key={step.id}
                      type="button"
                      className={`stepButton ${
                        step.id === activeStep ? "active" : ""
                      } ${completed ? "completed" : ""}`}
                      disabled={!available || Boolean(createdListingId)}
                      onClick={() => changeStep(step.id)}
                    >
                      <span>{completed ? "✓" : step.id}</span>
                      <strong>{step.shortTitle}</strong>
                    </button>
                  );
                })}
              </div>
            </section>

            <div className={`wizardLayout ${activeStep === 2 ? "selectionFocus" : ""}`}>
              <div className="wizardMain">
                <div className="formGrid">
                <div className={`card formCard ${activeStep === 1 ? "stepActive" : "stepHidden"}`}>
                <div className="stepHead">
                  <span>مرحله ۱</span>
                  <h2>این آگهی به نام چه کسی ثبت شود؟</h2>
                  <p>
                    می‌توانید آگهی را شخصی ثبت کنید یا اگر نمایشگاه دارید، به
                    نام نمایشگاه خودتان منتشر کنید.
                  </p>
                </div>

                <div className="ownerGrid">
                  <button
                    type="button"
                    className={`ownerCard ${listingOwnerType === "personal" ? "active" : ""}`}
                    onClick={() => {
                      setListingOwnerType("personal");
                      setSelectedDealerId("");
                    }}
                    disabled={Boolean(createdListingId)}
                  >
                    <strong>آگهی شخصی</strong>
                    <span>آگهی به نام خودم ثبت شود.</span>
                  </button>

                  <button
                    type="button"
                    className={`ownerCard ${listingOwnerType === "dealer" ? "active" : ""}`}
                    onClick={() => {
                      if (dealers.length > 0) {
                        setListingOwnerType("dealer");
                        setSelectedDealerId(String(dealers[0].id));
                      }
                    }}
                    disabled={dealers.length === 0 || Boolean(createdListingId)}
                  >
                    <strong>آگهی نمایشگاهی</strong>
                    <span>
                      {dealers.length > 0
                        ? "نام نمایشگاه روی آگهی نمایش داده می‌شود."
                        : "اول نمایشگاه خود را اضافه کنید."}
                    </span>
                  </button>
                </div>

                {listingOwnerType === "dealer" && dealers.length > 0 && (
                  <label className="field dealerSelectField">
                    <span>انتخاب نمایشگاه</span>
                    <select
                      value={selectedDealerId}
                      disabled={Boolean(createdListingId)}
                      onChange={(e) => setSelectedDealerId(e.target.value)}
                    >
                      <option value="">انتخاب نمایشگاه</option>
                      {dealers.map((dealer) => (
                        <option key={dealer.id} value={dealer.id}>
                          {dealer.dealer_name || `نمایشگاه شماره ${dealer.id}`}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {dealers.length === 0 && (
                  <a className="secondaryLink" href="/dealers">
                    افزودن نمایشگاه
                  </a>
                )}
              </div>

                <div className={`card formCard ${activeStep === 2 ? "stepActive" : "stepHidden"}`}>
                <div className="stepHead">
                  <span>مرحله ۲</span>
                  <h2>وضعیت فروش خودرو چیست؟</h2>
                  <p>
                    این انتخاب مسیر نمایش آگهی را مشخص می‌کند و به خریدار کمک
                    می‌کند سریع‌تر نوع معامله را بفهمد.
                  </p>
                </div>

                <div className="saleStatusGrid">
                  {saleStatuses.map((item) => {
                    const active = categoryCode === item.code;

                    return (
                      <button
                        key={item.code}
                        type="button"
                        className={`saleStatusCard ${active ? "active" : ""}`}
                        onClick={() => setCategoryCode(item.code)}
                        disabled={Boolean(createdListingId)}
                        aria-pressed={active}
                      >
                        <div className="saleTop">
                          <div className="saleIcon">{item.icon}</div>
                          <div>
                            <strong>{item.title}</strong>
                            <span>{item.subtitle}</span>
                          </div>
                        </div>
                        <p>{item.hint}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

                <div className={`card formCard ${activeStep === 3 ? "stepActive" : "stepHidden"}`}>
                <div className="stepHead">
                  <span>مرحله ۳</span>
                  <h2>انتخاب خودرو</h2>
                  <p>
                    برند و مدل از کاتالوگ چاکود انتخاب می‌شوند تا جستجو و فیلتر
                    آگهی‌ها دقیق و تمیز بماند.
                  </p>
                </div>

                <div className="twoCols">
                  <label className="field">
                    <span>برند خودرو</span>
                    <SearchableVehicleSelect
                      value={vehicleBrandCode}
                      disabled={Boolean(createdListingId)}
                      loading={vehicleBrands.length === 0}
                      placeholder="نام برند را تایپ یا انتخاب کنید"
                      emptyText="برندی با این عبارت پیدا نشد."
                      options={vehicleBrands.map((item) => ({
                        value: item.code,
                        label: item.name_fa,
                        secondary: [item.name_en, item.country]
                          .filter(Boolean)
                          .join(" • "),
                        keywords: [
                          item.code,
                          item.name_fa,
                          item.name_en,
                          item.country,
                          item.market_group,
                        ]
                          .filter(Boolean)
                          .join(" "),
                      }))}
                      onChange={(nextValue) => {
                        setVehicleBrandCode(nextValue);
                        setVehicleModelCode("");
                        setVehicleCustomModelName("");
                      }}
                    />
                  </label>

                  <label className="field">
                    <span>مدل خودرو</span>
                    <SearchableVehicleSelect
                      value={vehicleModelCode}
                      disabled={
                        !vehicleBrandCode ||
                        vehicleLoading ||
                        Boolean(createdListingId)
                      }
                      loading={vehicleLoading}
                      placeholder={
                        vehicleBrandCode
                          ? "نام یا کد مدل را تایپ کنید"
                          : "ابتدا برند را انتخاب کنید"
                      }
                      emptyText="مدلی با این عبارت برای برند انتخاب‌شده پیدا نشد."
                      options={vehicleModels.map((item) => ({
                        value: item.code,
                        label: item.name_fa,
                        secondary: [item.name_en, item.body_hint]
                          .filter(Boolean)
                          .join(" • "),
                        keywords: [
                          item.code,
                          item.name_fa,
                          item.name_en,
                          item.body_hint,
                        ]
                          .filter(Boolean)
                          .join(" "),
                      }))}
                      onChange={(nextValue) => {
                        setVehicleModelCode(nextValue);

                        if (nextValue !== "other") {
                          setVehicleCustomModelName("");
                        }
                      }}
                    />
                  </label>
                </div>

                {vehicleModelCode === "other" && (
                  <label className="field">
                    <span>نام مدل خاص</span>
                    <input
                      value={vehicleCustomModelName}
                      disabled={Boolean(createdListingId)}
                      onChange={(e) =>
                        setVehicleCustomModelName(e.target.value)
                      }
                      placeholder="مثلاً مدل خاص، کلاسیک یا کمیاب"
                    />
                  </label>
                )}

                {vehicleLoading && (
                  <div className="message hintMessage">
                    در حال دریافت اطلاعات خودرو...
                  </div>
                )}
              </div>

                <div className={`card formCard ${activeStep === 4 ? "stepActive" : "stepHidden"}`}>
                <div className="stepHead">
                  <span>مرحله ۴</span>
                  <h2>مشخصات اصلی آگهی</h2>
                  <p>
                    این اطلاعات در کارت آگهی و صفحه جزئیات خودرو نمایش داده
                    می‌شود.
                  </p>
                </div>

                <label className="field">
                  <span>عنوان آگهی</span>
                  <input
                    value={title}
                    disabled={Boolean(createdListingId)}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثلاً تویوتا کمری تمیز و کم‌کارکرد"
                  />
                </label>

                <div className="threeCols">
                  <label className="field">
                    <span>سال تولید</span>
                    <select
                      value={productionYear}
                      disabled={Boolean(createdListingId)}
                      onChange={(e) => setProductionYear(e.target.value)}
                    >
                      <option value="">انتخاب سال</option>
                      <optgroup label="سال شمسی">
                        {persianYears.map((year) => (
                          <option key={`fa-${year}`} value={year}>
                            {year}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="سال میلادی">
                        {gregorianYears.map((year) => (
                          <option key={`en-${year}`} value={year}>
                            {year}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </label>

                  <label className="field">
                    <span>کارکرد کیلومتر</span>
                    <input
                      value={mileageKm}
                      disabled={Boolean(createdListingId)}
                      onChange={(e) =>
                        setMileageKm(cleanNumberInput(e.target.value))
                      }
                      placeholder="18000"
                      inputMode="numeric"
                    />
                  </label>

                  <label className="field">
                    <span>قیمت تومان</span>
                    <input
                      value={formatNumber(priceToman)}
                      disabled={Boolean(createdListingId)}
                      onChange={(e) =>
                        setPriceToman(cleanNumberInput(e.target.value))
                      }
                      placeholder="8,500,000,000"
                      inputMode="numeric"
                    />
                  </label>
                </div>
              </div>

                <div className={`card formCard ${activeStep === 5 ? "stepActive" : "stepHidden"}`}>
                <div className="stepHead">
                  <span>مرحله ۵</span>
                  <h2>وضعیت فنی و ظاهری</h2>
                  <p>
                    این بخش به خریدار کمک می‌کند سریع‌تر وضعیت خودرو را بفهمد.
                  </p>
                </div>

                <div className="twoCols">
                  <label className="field">
                    <span>رنگ</span>
                    <select
                      value={color}
                      disabled={Boolean(createdListingId)}
                      onChange={(e) => setColor(e.target.value)}
                    >
                      <option value="">انتخاب رنگ</option>
                      {colors.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>وضعیت بدنه</span>
                    <select
                      value={bodyStatus}
                      disabled={Boolean(createdListingId)}
                      onChange={(e) => setBodyStatus(e.target.value)}
                    >
                      <option value="سالم">سالم</option>
                      <option value="رنگ‌شدگی جزئی">رنگ‌شدگی جزئی</option>
                      <option value="دوررنگ">دوررنگ</option>
                      <option value="تصادفی">تصادفی</option>
                    </select>
                  </label>
                </div>

                <div className="twoCols">
                  <label className="field">
                    <span>گیربکس</span>
                    <select
                      value={transmission}
                      disabled={Boolean(createdListingId)}
                      onChange={(e) => setTransmission(e.target.value)}
                    >
                      <option value="اتوماتیک">اتوماتیک</option>
                      <option value="دستی">دستی</option>
                    </select>
                  </label>

                  <label className="field">
                    <span>سوخت</span>
                    <select
                      value={fuelType}
                      disabled={Boolean(createdListingId)}
                      onChange={(e) => setFuelType(e.target.value)}
                    >
                      <option value="بنزین">بنزین</option>
                      <option value="هیبرید">هیبرید</option>
                      <option value="برقی">برقی</option>
                      <option value="دیزل">دیزل</option>
                    </select>
                  </label>
                </div>
              </div>

                <div className={`card formCard ${activeStep === 6 ? "stepActive" : "stepHidden"}`}>
                <div className="stepHead">
                  <span>مرحله ۶</span>
                  <h2>موقعیت خودرو</h2>
                  <p>
                    استان، شهر و در صورت نیاز محله را انتخاب کنید. می‌توانید از
                    تشخیص موقعیت هم استفاده کنید؛ موقعیت دقیق عمومی نمایش داده
                    نمی‌شود.
                  </p>
                </div>

                <button
                  type="button"
                  className="locationDetectBtn"
                  disabled={locationDetecting || Boolean(createdListingId)}
                  onClick={detectCurrentLocation}
                >
                  {locationDetecting
                    ? "در حال تشخیص موقعیت..."
                    : "📍 تشخیص موقعیت من"}
                </button>

                {locationMessage && (
                  <div className="message success">{locationMessage}</div>
                )}
                {locationError && (
                  <div className="message error">{locationError}</div>
                )}

                {locationLabel && (
                  <div className="locationPreview">
                    <strong>موقعیت حدودی:</strong>
                    <span>{locationLabel}</span>
                  </div>
                )}

                <div className={cityHasNeighborhoods ? "threeCols" : "twoCols"}>
                  <label className="field">
                    <span>استان</span>
                    <select
                      value={province}
                      disabled={Boolean(createdListingId)}
                      onChange={(e) => {
                        setProvince(e.target.value);
                        setLatitude("");
                        setLongitude("");
                        setLocationAccuracy("");
                        setLocationLabel("");
                        setLocationSource("");
                        setLocationMessage("");
                        setLocationError("");
                      }}
                    >
                      <option value="">انتخاب استان</option>
                      {provinces.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>شهر</span>
                    <select
                      value={city}
                      disabled={
                        !province || geoLoading || Boolean(createdListingId)
                      }
                      onChange={(e) => {
                        setCity(e.target.value);
                        setLatitude("");
                        setLongitude("");
                        setLocationAccuracy("");
                        setLocationLabel("");
                        setLocationSource("");
                        setLocationMessage("");
                        setLocationError("");
                      }}
                    >
                      <option value="">
                        {province ? "انتخاب شهر" : "اول استان را انتخاب کنید"}
                      </option>
                      {cities.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>

                  {cityHasNeighborhoods && (
                    <label className="field">
                      <span>محله</span>
                      <select
                        value={neighborhood}
                        disabled={
                          !province ||
                          !city ||
                          geoLoading ||
                          Boolean(createdListingId)
                        }
                        onChange={(e) => setNeighborhood(e.target.value)}
                      >
                        <option value="">انتخاب محله</option>
                        {neighborhoods.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>

                {geoLoading && (
                  <div className="message hintMessage">
                    در حال دریافت موقعیت‌ها...
                  </div>
                )}

                <label className="field">
                  <span>توضیحات آگهی</span>
                  <textarea
                    value={description}
                    disabled={Boolean(createdListingId)}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="توضیحات کامل خودرو، وضعیت سند، بیمه، آپشن‌ها و شرایط فروش..."
                  />
                </label>
              </div>

                <div className={`card formCard uploadCard ${activeStep === 7 ? "stepActive" : "stepHidden"}`}>
                <div className="stepHead">
                  <span>مرحله ۷</span>
                  <h2>تصاویر خودرو</h2>
                  <p>
                    عکس‌ها را همین‌جا انتخاب کنید. سپس زیر عکس دلخواه روی
                    «انتخاب عکس اصلی» بزنید. عکس انتخاب‌شده هنگام ثبت آگهی، به‌عنوان
                    تصویر اصلی ذخیره می‌شود.
                  </p>
                </div>

                <label className="uploadBox">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={(e) => {
                      handleImageSelect(e.target.files);
                      e.target.value = "";
                    }}
                    disabled={
                      submitting ||
                      uploadingImages ||
                      imageProcessing ||
                      imageCount >= MAX_IMAGE_COUNT
                    }
                  />
                  <div className="uploadIcon">📸</div>
                  <strong>انتخاب عکس خودرو</strong>
                  <span>
                    JPG، PNG یا WEBP؛ تبدیل خودکار به WEBP و حداکثر ضلع ۱۶۰۰
                    پیکسل
                  </span>
                  <small>
                    {imageProcessing
                      ? "در حال بهینه‌سازی تصاویر..."
                      : `${imageCount}/${MAX_IMAGE_COUNT} تصویر انتخاب شده`}
                  </small>
                </label>

                {images.length > 0 && (
                  <div className="imageGrid">
                    {images.map((item) => {
                      const opacity =
                        item.status === "uploaded"
                          ? 1
                          : item.status === "uploading"
                            ? 0.35 + item.progress / 160
                            : 0.82;

                      const isDeleting =
                        Boolean(item.image_id) &&
                        deletingImageId === item.image_id;
                      const isChosenCover =
                        selectedCoverLocalId === item.localId ||
                        (!selectedCoverLocalId && Boolean(item.is_cover));
                      const isChangingCover =
                        Boolean(item.image_id) &&
                        coverChangingId === item.image_id;

                      return (
                        <div
                          className={`imageItem ${item.status} ${
                            isChosenCover ? "chosenCover" : ""
                          }`}
                          key={item.localId}
                        >
                          <div
                            className="imagePreview"
                            role="button"
                            tabIndex={item.status === "uploading" ? -1 : 0}
                            title={
                              isChosenCover
                                ? "این تصویر عکس اصلی است"
                                : "انتخاب به‌عنوان عکس اصلی"
                            }
                            onClick={() => {
                              if (item.status !== "uploading") {
                                void chooseCoverImage(item);
                              }
                            }}
                            onKeyDown={(event) => {
                              if (
                                item.status !== "uploading" &&
                                (event.key === "Enter" || event.key === " ")
                              ) {
                                event.preventDefault();
                                void chooseCoverImage(item);
                              }
                            }}
                          >
                            <img
                              src={item.image_url || item.previewUrl}
                              alt="تصویر خودرو"
                              style={{ opacity }}
                            />

                            <span className="imageSizeBadge">
                              {formatFileSize(item.file.size)}
                            </span>

                            {item.status === "uploading" && (
                              <div className="uploadOverlay">
                                <div className="miniSpinner" />
                                <span>{item.progress}%</span>
                                <div className="progressTrack">
                                  <div
                                    className="progressFill"
                                    style={{ width: `${item.progress}%` }}
                                  />
                                </div>

                                <button
                                  type="button"
                                  className="stopUploadBtn"
                                  onClick={() => stopImageUpload(item.localId)}
                                >
                                  توقف آپلود
                                </button>
                              </div>
                            )}

                            {isChosenCover && item.status !== "uploading" && (
                              <span className="coverBadge">✓ عکس اصلی</span>
                            )}

                            {item.status === "error" && (
                              <span className="imageErrorBadge">آپلود نشد</span>
                            )}

                            {item.status === "cancelled" && (
                              <span className="imageCancelledBadge">
                                متوقف شد
                              </span>
                            )}
                          </div>

                          {item.status !== "uploading" && (
                            <div className="imageActions">
                              <button
                                type="button"
                                className={`coverBtn ${
                                  isChosenCover ? "active" : ""
                                }`}
                                onClick={() => void chooseCoverImage(item)}
                                disabled={isChangingCover || isDeleting}
                              >
                                {isChangingCover
                                  ? "در حال ثبت..."
                                  : isChosenCover
                                    ? "✓ عکس اصلی"
                                    : "انتخاب عکس اصلی"}
                              </button>

                              {(item.status === "error" ||
                                item.status === "cancelled") &&
                                createdListingId && (
                                  <button
                                    type="button"
                                    className="retryImageBtn"
                                    onClick={() => retryOneImage(item.localId)}
                                    disabled={uploadingImages}
                                  >
                                    تلاش دوباره
                                  </button>
                                )}

                              <button
                                type="button"
                                className="removeImageBtn"
                                onClick={() => removeImage(item.localId)}
                                disabled={isDeleting}
                              >
                                {isDeleting ? "در حال حذف..." : "حذف"}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {uploadingImages && (
                  <button
                    type="button"
                    className="stopAllBtn"
                    onClick={stopAllImageUploads}
                  >
                    توقف همه آپلودها
                  </button>
                )}

                {imageMessage && (
                  <div className="message success">{imageMessage}</div>
                )}
                {imageError && (
                  <div className="message error">{imageError}</div>
                )}

                {createdListingId && hasRetryableImages && (
                  <button
                    type="button"
                    className="secondaryBtn"
                    disabled={uploadingImages || imageProcessing}
                    onClick={retryFailedImages}
                  >
                    {uploadingImages
                      ? "در حال آپلود..."
                      : "آپلود تصاویر باقی‌مانده"}
                  </button>
                )}

                <button
                  className="primaryBtn finalSubmitBtn"
                  disabled={
                    !canSubmit ||
                    submitting ||
                    uploadingImages ||
                    imageProcessing ||
                    Boolean(createdListingId)
                  }
                  onClick={submitListing}
                >
                  {createdListingId
                    ? "آگهی ثبت شد"
                    : uploadingImages
                      ? "در حال آپلود تصاویر..."
                      : submitting
                        ? "در حال ثبت آگهی..."
                        : "ثبت آگهی"}
                </button>

                {!canSubmit && !createdListingId && (
                  <div className="message hintMessage">
                    برای ثبت آگهی، صاحب آگهی، عنوان، برند، مدل، سال تولید، استان
                    و شهر را کامل انتخاب کنید. اگر شهر انتخاب‌شده محله داشته
                    باشد، انتخاب محله هم لازم است.
                  </div>
                )}

                {message && (
                  <div className="message success">
                    {message}
                    {createdListingId && (
                      <div className="smallLine">
                        شناسه آگهی: {createdListingId}
                      </div>
                    )}
                  </div>
                )}

                {error && <div className="message error">{error}</div>}
                </div>
              </div>

                {stepError && <div className="message error wizardError">{stepError}</div>}

                <div className="wizardActions">
                  <button
                    type="button"
                    className="wizardBack"
                    disabled={activeStep === 1 || submitting || uploadingImages}
                    onClick={() => changeStep(activeStep - 1)}
                  >
                    مرحله قبل
                  </button>

                  {activeStep < 7 ? (
                    <button
                      type="button"
                      className="wizardNext"
                      disabled={!isStepValid(activeStep)}
                      onClick={() => changeStep(activeStep + 1)}
                    >
                      ادامه؛ {formSteps[activeStep]?.title}
                    </button>
                  ) : (
                    <span className="wizardFinalHint">
                      پس از کنترل تصاویر، دکمه «ثبت آگهی» را بزنید.
                    </span>
                  )}
                </div>
              </div>

              <aside className="wizardAside">
                <div className="summaryCard">
                  <span className="summaryEyebrow">پیش‌نمایش اطلاعات</span>
                  <h3>{title.trim() || "عنوان خودرو هنوز وارد نشده"}</h3>

                  <div className="summaryRows">
                    <div><span>صاحب آگهی</span><strong>{selectedOwnerTitle}</strong></div>
                    <div><span>نوع فروش</span><strong>{selectedCategoryTitle}</strong></div>
                    <div>
                      <span>خودرو</span>
                      <strong>{[brandName, modelName].filter(Boolean).join(" ") || "انتخاب نشده"}</strong>
                    </div>
                    <div>
                      <span>موقعیت</span>
                      <strong>{[province, city].filter(Boolean).join("، ") || "انتخاب نشده"}</strong>
                    </div>
                    <div>
                      <span>قیمت</span>
                      <strong>{priceToman ? `${formatNumber(priceToman)} تومان` : "توافقی یا وارد نشده"}</strong>
                    </div>
                    <div><span>تصاویر</span><strong>{imageCount} تصویر</strong></div>
                  </div>

                  <p>
                    اطلاعات را مرحله‌به‌مرحله کامل کنید. قبل از ثبت نهایی، همه
                    موارد در همین خلاصه قابل کنترل هستند.
                  </p>
                </div>
              </aside>
            </div>
          </>
        )}
      </section>

      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #faf7ff;
        }

        .submitPage {
          min-height: 100vh;
          font-family: Tahoma, Arial, sans-serif;
          color: #211335;
          background:
            radial-gradient(circle at 84% 10%, rgba(123, 44, 255, 0.16), transparent 32%),
            linear-gradient(180deg, #ffffff 0%, #faf7ff 52%, #ffffff 100%);
          padding: 24px;
        }

        .shell {
          width: min(1120px, 100%);
          margin: 0 auto;
        }

        .topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 11px;
          text-decoration: none;
          color: #211335;
        }

        .brandLogo {
          width: 142px;
          max-height: 48px;
          display: block;
          object-fit: contain;
        }

        .navLinks {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }

        .navLinks a {
          color: #6d28d9;
          background: #fff;
          border: 1px solid #eadcff;
          border-radius: 999px;
          padding: 10px 14px;
          text-decoration: none;
          font-size: 13px;
          font-weight: bold;
        }

        .heroCard,
        .card {
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid #eadcff;
          border-radius: 34px;
          padding: 34px;
          box-shadow: 0 24px 70px rgba(76, 29, 149, 0.12);
        }

        .heroCard {
          margin-bottom: 22px;
        }

        .centerCard {
          width: min(560px, 100%);
          margin: 80px auto 0;
          text-align: center;
        }

        .formGrid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 22px;
        }

        .submitHero {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 28px;
          background:
            radial-gradient(circle at 8% 10%, rgba(34, 197, 94, 0.1), transparent 28%),
            radial-gradient(circle at 92% 0%, rgba(124, 58, 237, 0.16), transparent 34%),
            rgba(255, 255, 255, 0.96);
        }

        .submitHero > div:first-child {
          max-width: 720px;
        }

        .heroTrust {
          display: grid;
          gap: 9px;
          min-width: 220px;
        }

        .heroTrust span {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 13px;
          border: 1px solid #e7dcfa;
          border-radius: 15px;
          background: rgba(255, 255, 255, 0.74);
          color: #4c1d95;
          font-size: 12px;
          font-weight: 800;
        }

        .heroTrust span::before {
          content: "✓";
          width: 21px;
          height: 21px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: #dcfce7;
          color: #15803d;
          font-size: 11px;
        }

        .wizardProgressCard {
          margin-bottom: 20px;
          padding: 22px;
          border: 1px solid #e5d7fb;
          border-radius: 28px;
          background: rgba(255, 255, 255, 0.92);
          box-shadow: 0 18px 48px rgba(76, 29, 149, 0.08);
          scroll-margin-top: 16px;
        }

        .wizardProgressTop {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 13px;
        }

        .wizardProgressTop div {
          display: grid;
          gap: 3px;
        }

        .wizardProgressTop span {
          color: #7c3aed;
          font-size: 12px;
          font-weight: 800;
        }

        .wizardProgressTop strong {
          color: #211335;
          font-size: 18px;
        }

        .wizardProgressTop em {
          font-style: normal;
          color: #166534;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 999px;
          padding: 8px 11px;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }

        .progressTrackMain {
          height: 8px;
          border-radius: 999px;
          background: #eee7f8;
          overflow: hidden;
        }

        .progressTrackMain span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #7c3aed, #9333ea, #22c55e);
          transition: width 0.35s ease;
        }

        .stepRail {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 8px;
          margin-top: 16px;
        }

        .stepButton {
          min-width: 0;
          border: 1px solid #eadff8;
          border-radius: 16px;
          padding: 10px 6px;
          background: #fff;
          color: #756485;
          font-family: inherit;
          cursor: pointer;
          display: grid;
          justify-items: center;
          gap: 6px;
          transition: 0.2s ease;
        }

        .stepButton > span {
          width: 27px;
          height: 27px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: #f2ecf9;
          color: #6d28d9;
          font-weight: 900;
          font-size: 11px;
        }

        .stepButton strong {
          font-size: 10px;
          line-height: 1.5;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }

        .stepButton.active {
          border-color: #7c3aed;
          color: #4c1d95;
          background: linear-gradient(180deg, #f7f1ff, #fff);
          box-shadow: 0 10px 24px rgba(109, 40, 217, 0.12);
        }

        .stepButton.active > span {
          color: #fff;
          background: linear-gradient(135deg, #6d28d9, #9333ea);
        }

        .stepButton.completed > span {
          color: #166534;
          background: #dcfce7;
        }

        .stepButton:disabled {
          cursor: not-allowed;
          opacity: 0.46;
        }

        .wizardLayout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 300px;
          align-items: start;
          gap: 20px;
        }

        .wizardMain {
          min-width: 0;
        }

        .wizardAside {
          position: sticky;
          top: 18px;
        }

        .wizardLayout.selectionFocus {
          grid-template-columns: minmax(0, 1fr);
        }

        .wizardLayout.selectionFocus .wizardAside {
          display: none;
        }

        .wizardLayout.selectionFocus .formCard {
          padding: 34px;
        }

        .wizardLayout.selectionFocus .stepHead {
          max-width: 760px;
          margin-inline: auto;
          text-align: center;
        }

        .summaryCard {
          padding: 22px;
          border-radius: 28px;
          border: 1px solid #e4d5fa;
          background:
            radial-gradient(circle at 100% 0%, rgba(124, 58, 237, 0.15), transparent 35%),
            #fff;
          box-shadow: 0 18px 50px rgba(76, 29, 149, 0.1);
        }

        .summaryEyebrow {
          color: #7c3aed;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.08em;
        }

        .summaryCard h3 {
          margin: 10px 0 18px;
          color: #211335;
          font-size: 18px;
          line-height: 1.8;
        }

        .summaryRows {
          display: grid;
          gap: 8px;
        }

        .summaryRows > div {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px dashed #eadff8;
        }

        .summaryRows span {
          color: #8b7a9d;
          font-size: 11px;
        }

        .summaryRows strong {
          color: #2f1947;
          font-size: 11px;
          text-align: left;
        }

        .summaryCard p {
          margin-top: 16px;
          padding: 13px;
          border-radius: 16px;
          background: #f8f4fd;
          color: #756485;
          font-size: 11px;
          line-height: 1.9;
        }

        .stepHidden {
          display: none;
        }

        .stepActive {
          display: block;
          animation: stepIn 0.28s ease both;
        }

        @keyframes stepIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .wizardActions {
          margin-top: 14px;
          display: grid;
          grid-template-columns: 150px minmax(0, 1fr);
          gap: 10px;
          padding: 12px;
          border: 1px solid #e6d9f8;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.94);
          box-shadow: 0 14px 36px rgba(76, 29, 149, 0.08);
        }

        .wizardBack,
        .wizardNext {
          min-height: 48px;
          border-radius: 15px;
          border: 0;
          font-family: inherit;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
        }

        .wizardBack {
          color: #5b416f;
          background: #f3edf9;
        }

        .wizardNext {
          color: #fff;
          background: linear-gradient(135deg, #6d28d9, #8b5cf6);
          box-shadow: 0 12px 24px rgba(109, 40, 217, 0.2);
        }

        .wizardBack:disabled,
        .wizardNext:disabled {
          opacity: 0.48;
          cursor: not-allowed;
          box-shadow: none;
        }

        .wizardFinalHint {
          display: flex;
          align-items: center;
          color: #756485;
          font-size: 12px;
          line-height: 1.9;
        }

        .wizardError {
          margin-top: 12px;
        }

        .miniLabel {
          display: inline-block;
          color: #6d28d9;
          background: #f4ecff;
          border: 1px solid #e4d4ff;
          border-radius: 999px;
          padding: 7px 11px;
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 14px;
        }

        h1 {
          margin: 0;
          font-size: 34px;
          line-height: 1.45;
        }

        h2 {
          margin: 0 0 8px;
          font-size: 25px;
        }

        p {
          color: #6d5b83;
          line-height: 2.1;
          margin: 14px 0 0;
        }

        .stepHead {
          margin-bottom: 20px;
        }

        .stepHead span {
          display: inline-block;
          color: #6d28d9;
          background: #f4ecff;
          border: 1px solid #e4d4ff;
          border-radius: 999px;
          padding: 7px 11px;
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 12px;
        }

        .stepHead p {
          margin-top: 8px;
          font-size: 13px;
        }

        .ownerGrid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }

        .ownerCard {
          border: 1px solid #eadcff;
          background: #fff;
          color: #24123d;
          border-radius: 22px;
          padding: 18px;
          text-align: right;
          cursor: pointer;
          font-family: inherit;
          transition: 0.2s ease;
        }

        .ownerCard strong {
          display: block;
          font-size: 16px;
          margin-bottom: 8px;
        }

        .ownerCard span {
          display: block;
          color: #7b6a91;
          font-size: 13px;
          line-height: 1.9;
        }

        .ownerCard.active {
          border-color: #7c3aed;
          box-shadow: 0 16px 36px rgba(109, 40, 217, 0.12);
          background: linear-gradient(180deg, #fbf8ff, #ffffff);
        }

        .ownerCard:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .dealerSelectField {
          margin-top: 16px;
        }

        .saleStatusGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 16px;
          max-width: 920px;
          margin: 0 auto;
        }

        .saleStatusCard {
          position: relative;
          overflow: hidden;
          border: 1px solid #e8dcf8;
          background: #fff;
          color: #24123d;
          font-family: inherit;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
          min-height: 150px;
          border-radius: 22px;
          padding: 20px;
          text-align: right;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .saleStatusCard:last-child {
          grid-column: 1 / -1;
          min-height: 132px;
        }

        .saleStatusCard::after {
          content: "";
          position: absolute;
          inset: auto auto -48px -48px;
          width: 126px;
          height: 126px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(124, 58, 237, 0.1), transparent 70%);
          pointer-events: none;
        }

        .saleStatusCard:disabled {
          cursor: not-allowed;
        }

        .saleStatusCard:hover {
          transform: translateY(-2px);
          border-color: #cdb5f3;
          box-shadow: 0 16px 36px rgba(76, 29, 149, 0.09);
        }

        .saleStatusCard.active {
          border-color: #7c3aed;
          background: linear-gradient(145deg, #fbf8ff 0%, #ffffff 72%);
          box-shadow: 0 18px 42px rgba(109, 40, 217, 0.13);
        }

        .saleStatusCard.active::before {
          content: "✓";
          position: absolute;
          top: 14px;
          left: 14px;
          width: 25px;
          height: 25px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          color: #fff;
          background: linear-gradient(135deg, #6d28d9, #9333ea);
          font-size: 12px;
          font-weight: 900;
        }

        .saleTop {
          display: grid;
          grid-template-columns: 52px minmax(0, 1fr);
          gap: 13px;
          align-items: center;
          padding-left: 30px;
        }

        .saleIcon {
          width: 52px;
          height: 52px;
          border-radius: 17px;
          display: grid;
          place-items: center;
          background: #f4ecff;
          color: #6d28d9;
          font-size: 23px;
          flex: 0 0 auto;
        }

        .saleStatusCard.active .saleIcon {
          background: linear-gradient(135deg, #6d28d9, #9333ea);
          color: #fff;
        }

        .saleStatusCard strong {
          display: block;
          font-size: 15px;
          color: #24123d;
          line-height: 1.65;
        }

        .saleStatusCard span {
          display: block;
          margin-top: 3px;
          font-size: 11px;
          color: #7b6a91;
          line-height: 1.7;
        }

        .saleStatusCard p {
          position: relative;
          z-index: 1;
          margin: 14px 0 0;
          font-size: 12px;
          color: #6d5b83;
          line-height: 1.85;
          max-width: 62ch;
        }

        .twoCols {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }

        .threeCols {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }

        .field {
          display: block;
          margin-bottom: 16px;
        }

        .field span {
          display: block;
          color: #6b5b82;
          font-size: 13px;
          margin-bottom: 8px;
        }

        .field input,
        .field select,
        .field textarea {
          width: 100%;
          border: 1px solid #e2d3ff;
          border-radius: 18px;
          padding: 15px;
          font-size: 15px;
          outline: 0;
          color: #24123d;
          background: #fff;
          font-family: inherit;
        }

        .field input:disabled,
        .field select:disabled,
        .field textarea:disabled {
          opacity: 0.66;
          cursor: not-allowed;
        }

        .field textarea {
          min-height: 135px;
          resize: vertical;
          line-height: 2;
        }


        .vehicleSearchSelect {
          position: relative;
          width: 100%;
        }

        .vehicleSearchSelect.disabled {
          opacity: 0.66;
        }

        .vehicleSearchInputWrap {
          position: relative;
        }

        .vehicleSearchInput {
          width: 100%;
          min-height: 51px;
          border: 1px solid #e2d3ff;
          border-radius: 18px;
          padding: 15px 76px 15px 15px;
          font-size: 15px;
          outline: 0;
          color: #24123d;
          background: #fff;
          font-family: inherit;
        }

        .vehicleSearchInput::placeholder {
          color: #9a8bac;
        }

        .vehicleSearchSelect.open .vehicleSearchInput {
          border-color: #8b5cf6;
          box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.12);
        }

        .vehicleSearchInput:disabled {
          cursor: not-allowed;
          background: #f8f5fb;
        }

        .vehicleSearchToggle,
        .vehicleSearchClear {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          border: 0;
          display: grid;
          place-items: center;
          cursor: pointer;
          font-family: inherit;
        }

        .vehicleSearchToggle {
          left: 10px;
          width: 34px;
          height: 34px;
          border-radius: 12px;
          color: #6d28d9;
          background: #f4ecff;
          font-weight: 900;
        }

        .vehicleSearchClear {
          left: 50px;
          width: 28px;
          height: 28px;
          border-radius: 999px;
          color: #be123c;
          background: #fff1f2;
          font-size: 19px;
          line-height: 1;
        }

        .vehicleSearchToggle:disabled {
          cursor: not-allowed;
        }

        .vehicleSearchSelectedMeta {
          margin-top: 7px;
          padding: 0 8px;
          color: #7b6a91;
          font-size: 11px;
          direction: ltr;
          text-align: right;
        }

        .vehicleSearchDropdown {
          position: absolute;
          z-index: 80;
          top: calc(100% + 8px);
          right: 0;
          left: 0;
          max-height: 320px;
          overflow-y: auto;
          overscroll-behavior: contain;
          background: #fff;
          border: 1px solid #d9c5ff;
          border-radius: 18px;
          padding: 7px;
          box-shadow: 0 24px 65px rgba(76, 29, 149, 0.2);
        }

        .vehicleSearchOption {
          width: 100%;
          border: 0;
          border-radius: 13px;
          background: transparent;
          color: #24123d;
          padding: 11px 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          text-align: right;
          cursor: pointer;
          font-family: inherit;
        }

        .vehicleSearchOption:hover,
        .vehicleSearchOption.highlighted {
          background: #f6efff;
        }

        .vehicleSearchOption.selected {
          color: #5b21b6;
          background: #f4ecff;
        }

        .vehicleSearchOptionText {
          min-width: 0;
          display: block;
        }

        .vehicleSearchOptionText strong {
          display: block;
          font-size: 14px;
          line-height: 1.7;
        }

        .vehicleSearchOptionText small {
          display: block;
          margin-top: 2px;
          color: #7b6a91;
          font-size: 11px;
          direction: ltr;
          text-align: right;
          line-height: 1.6;
        }

        .vehicleSearchCheck {
          flex: 0 0 auto;
          width: 24px;
          height: 24px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          color: #fff;
          background: #6d28d9;
          font-size: 12px;
          font-weight: bold;
        }

        .vehicleSearchEmpty {
          padding: 18px 12px;
          color: #7b6a91;
          text-align: center;
          font-size: 13px;
          line-height: 1.9;
        }

        .field input:focus,
        .field select:focus,
        .field textarea:focus {
          border-color: #8b5cf6;
          box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.12);
        }

        .locationDetectBtn {
          border: 1px solid #d7c2ff;
          background: #f4ecff;
          color: #5b21b6;
          border-radius: 17px;
          padding: 13px 16px;
          font-weight: bold;
          cursor: pointer;
          font-family: inherit;
          margin-bottom: 16px;
        }

        .locationDetectBtn:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .locationPreview {
          border: 1px solid #d7c2ff;
          background: #fbf8ff;
          border-radius: 18px;
          padding: 14px;
          margin: 16px 0;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          color: #5b21b6;
          line-height: 1.9;
        }

        .locationPreview span {
          color: #24123d;
        }

        .primaryLink,
        .primaryBtn,
        .secondaryLink,
        .secondaryBtn {
          width: 100%;
          border: 0;
          border-radius: 17px;
          padding: 14px 16px;
          font-weight: bold;
          font-size: 14px;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          text-align: center;
          font-family: inherit;
        }

        .primaryLink,
        .primaryBtn {
          color: #fff;
          background: linear-gradient(135deg, #6d28d9, #9333ea);
        }

        .secondaryLink,
        .secondaryBtn {
          margin-top: 16px;
          color: #6d28d9;
          background: #f4ecff;
          border: 1px solid #e4d4ff;
        }

        .primaryBtn:disabled,
        .secondaryBtn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .finalSubmitBtn {
          margin-top: 18px;
        }

        .message {
          margin-top: 16px;
          border-radius: 16px;
          padding: 13px;
          font-size: 13px;
          line-height: 1.9;
        }

        .success {
          background: #f0fdf4;
          color: #166534;
          border: 1px solid #bbf7d0;
        }

        .error {
          background: #fff1f2;
          color: #be123c;
          border: 1px solid #fecdd3;
        }

        .hintMessage {
          background: #fffbeb;
          color: #92400e;
          border: 1px solid #fde68a;
        }

        .smallLine {
          margin-top: 6px;
          font-size: 12px;
        }

        .uploadCard {
          border-color: #d7c2ff;
          background:
            radial-gradient(circle at 92% 0%, rgba(109, 40, 217, 0.1), transparent 30%),
            rgba(255, 255, 255, 0.94);
        }

        .uploadBox {
          display: grid;
          place-items: center;
          text-align: center;
          border: 2px dashed #cdb8f6;
          background: #fbf8ff;
          border-radius: 26px;
          padding: 30px;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .uploadBox:hover {
          border-color: #8b5cf6;
          background: #f7f0ff;
        }

        .uploadBox input {
          display: none;
        }

        .uploadIcon {
          width: 64px;
          height: 64px;
          border-radius: 24px;
          display: grid;
          place-items: center;
          background: #f4ecff;
          color: #6d28d9;
          font-size: 30px;
          margin-bottom: 12px;
        }

        .uploadBox strong {
          display: block;
          color: #24123d;
          font-size: 16px;
          margin-bottom: 7px;
        }

        .uploadBox span {
          display: block;
          color: #7b6a91;
          font-size: 12px;
          line-height: 1.9;
        }

        .uploadBox small {
          margin-top: 8px;
          color: #6d28d9;
          font-weight: bold;
        }

        .imageGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-top: 18px;
        }

        .imageItem {
          position: relative;
          display: flex;
          min-width: 0;
          flex-direction: column;
          overflow: hidden;
          border-radius: 18px;
          border: 1px solid #eadcff;
          background: #fff;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .imageItem.chosenCover {
          border-color: #22c55e;
          box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.13);
        }

        .imagePreview {
          position: relative;
          aspect-ratio: 4 / 3;
          overflow: hidden;
          background: #f4effb;
          cursor: pointer;
        }

        .imageItem.uploading .imagePreview {
          cursor: default;
        }

        .imagePreview:focus-visible {
          outline: 3px solid rgba(109, 40, 217, 0.35);
          outline-offset: -3px;
        }

        .imageItem img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: opacity 0.28s ease;
        }

        .imageItem.uploading {
          box-shadow: inset 0 0 0 2px rgba(109, 40, 217, 0.18);
        }

        .uploadOverlay {
          position: absolute;
          inset: 0;
          background: rgba(36, 18, 61, 0.42);
          color: #fff;
          display: grid;
          place-items: center;
          gap: 8px;
          padding: 14px;
          text-align: center;
        }

        .miniSpinner {
          width: 28px;
          height: 28px;
          border-radius: 999px;
          border: 3px solid rgba(255, 255, 255, 0.38);
          border-top-color: #fff;
          animation: spin 0.8s linear infinite;
        }

        .progressTrack {
          width: 80%;
          height: 6px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.3);
          overflow: hidden;
        }

        .progressFill {
          height: 100%;
          border-radius: 999px;
          background: #fff;
          transition: width 0.2s ease;
        }

        .imageActions {
          position: static;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 7px;
          padding: 9px;
          background: #fff;
          z-index: 4;
        }

        .removeImageBtn,
        .coverBtn,
        .retryImageBtn,
        .stopUploadBtn,
        .stopAllBtn {
          border: 0;
          border-radius: 12px;
          color: #fff;
          padding: 9px 10px;
          font-size: 11px;
          cursor: pointer;
          font-family: inherit;
          font-weight: bold;
        }

        .removeImageBtn {
          min-width: 58px;
          background: #be123c;
        }

        .coverBtn {
          grid-column: 1 / -1;
          width: 100%;
          background: #6d28d9;
        }

        .coverBtn.active {
          background: #15803d;
        }

        .retryImageBtn {
          background: #0369a1;
        }

        .stopUploadBtn {
          background: rgba(190, 18, 60, 0.96);
          padding: 8px 12px;
        }

        .stopAllBtn {
          width: 100%;
          margin-top: 14px;
          padding: 12px 16px;
          background: #be123c;
          font-size: 13px;
        }

        .removeImageBtn:disabled,
        .coverBtn:disabled,
        .retryImageBtn:disabled {
          opacity: 0.65;
          cursor: wait;
        }

        .coverBadge {
          position: absolute;
          right: 8px;
          top: 8px;
          border-radius: 999px;
          background: rgba(21, 128, 61, 0.96);
          color: #fff;
          padding: 7px 10px;
          font-size: 11px;
          font-weight: bold;
          z-index: 5;
        }

        .imageErrorBadge,
        .imageCancelledBadge,
        .imageSizeBadge {
          position: absolute;
          border-radius: 999px;
          color: #fff;
          padding: 7px 10px;
          font-size: 11px;
          font-weight: bold;
          z-index: 3;
        }

        .imageErrorBadge {
          right: 8px;
          top: 8px;
          background: rgba(190, 18, 60, 0.94);
        }

        .imageCancelledBadge {
          right: 8px;
          top: 8px;
          background: rgba(146, 64, 14, 0.94);
        }

        .imageSizeBadge {
          left: 8px;
          top: 8px;
          direction: rtl;
          background: rgba(36, 18, 61, 0.72);
          font-weight: normal;
        }

        .loader {
          width: 42px;
          height: 42px;
          border-radius: 999px;
          border: 4px solid #eadcff;
          border-top-color: #6d28d9;
          margin: 0 auto 18px;
          animation: spin 0.85s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 980px) {
          .wizardLayout {
            grid-template-columns: 1fr;
          }

          .wizardAside {
            position: static;
          }

          .summaryCard {
            display: none;
          }
        }

        @media (max-width: 840px) {
          .stepRail {
            display: flex;
            overflow-x: auto;
            padding-bottom: 5px;
            scroll-snap-type: x mandatory;
            scrollbar-width: none;
            -ms-overflow-style: none;
          }

          .stepRail::-webkit-scrollbar {
            display: none;
          }

          .stepButton {
            flex: 0 0 78px;
            scroll-snap-align: start;
          }
        }

        @media (max-width: 1120px) {
          .saleStatusGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .saleStatusCard:last-child {
            grid-column: 1 / -1;
          }

          .imageGrid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 760px) {
          .submitPage {
            padding: 10px 10px calc(118px + env(safe-area-inset-bottom));
          }

          .brandLogo {
            width: 118px;
            max-height: 40px;
          }

          .submitHero {
            display: block;
          }

          .heroTrust {
            grid-template-columns: repeat(3, 1fr);
            min-width: 0;
            margin-top: 18px;
          }

          .heroTrust span {
            min-width: 0;
            padding: 9px 7px;
            justify-content: center;
            text-align: center;
            font-size: 9px;
          }

          .heroTrust span::before {
            display: none;
          }

          .wizardProgressCard {
            padding: 16px;
            border-radius: 22px;
          }

          .wizardProgressTop strong {
            font-size: 15px;
          }

          .wizardActions {
            position: sticky;
            bottom: calc(78px + env(safe-area-inset-bottom));
            z-index: 40;
            grid-template-columns: 96px minmax(0, 1fr);
            padding: 8px;
            border-radius: 18px;
            backdrop-filter: blur(18px);
            background: rgba(255, 255, 255, 0.92);
          }

          .wizardBack,
          .wizardNext {
            min-height: 46px;
            font-size: 11px;
          }

          .heroCard,
          .card {
            padding: 24px;
            border-radius: 26px;
          }

          .topbar {
            align-items: flex-start;
            flex-direction: column;
          }

          .ownerGrid,
          .saleStatusGrid,
          .twoCols,
          .threeCols {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .imageGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .saleStatusGrid {
            grid-template-columns: 1fr !important;
          }

          .saleStatusCard,
          .saleStatusCard:last-child {
            min-height: auto;
            grid-column: auto;
            padding: 17px;
          }

          .saleTop {
            grid-template-columns: 46px minmax(0, 1fr);
            padding-left: 28px;
          }

          .saleIcon {
            width: 46px;
            height: 46px;
            border-radius: 15px;
          }

          .wizardLayout.selectionFocus .formCard {
            padding: 22px;
          }

          h1 {
            font-size: 27px;
          }
        }
      `}</style>
    </main>
  );
}
