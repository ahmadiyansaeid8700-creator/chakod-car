"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const API_BASE = "https://api.chakod.com";

type ListingImage = {
  id: number;
  listing_id: number;
  image_url: string;
  is_cover: boolean;
  sort_order?: number;
  created_at?: string;
};

type ManagedListing = {
  id: number;
  title: string;
  brand?: string;
  model?: string;
  year?: string | number | null;
  mileage_km?: string | number | null;
  price_toman?: string | number | null;
  province?: string;
  city?: string;
  neighborhood?: string;
  location_label?: string;
  listing_owner_type?: "personal" | "dealer";
  seller_display_name?: string;
  dealer_id?: number | null;
  category_code?: string;
  color?: string;
  body_status?: string;
  transmission?: string;
  fuel_type?: string;
  description?: string;
  status: {
    code: string;
    title: string;
    raw?: string;
  };
  is_active?: number | string | null;
  created_at?: string;
  updated_at?: string;
};

type ManageResponse = {
  success: boolean;
  message?: string;
  access?: {
    can_view: boolean;
    can_manage: boolean;
    reason?: string;
  };
  listing?: ManagedListing;
  images?: ListingImage[];
};

type UploadItem = {
  localId: string;
  file: File;
  previewUrl: string;
  status: "selected" | "uploading" | "uploaded" | "error";
  progress: number;
  error?: string;
};

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("chakod_session_token") || "";
}

function formatNumber(value: number | string | null | undefined) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "۰";
  return n.toLocaleString("fa-IR");
}

function formatPrice(value: number | string | null | undefined) {
  const n = Number(value || 0);

  if (!Number.isFinite(n) || n <= 0) {
    return "قیمت توافقی";
  }

  if (n >= 1_000_000_000) {
    return `${(n / 1_000_000_000).toLocaleString("fa-IR", {
      maximumFractionDigits: 1,
    })} میلیارد تومان`;
  }

  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toLocaleString("fa-IR", {
      maximumFractionDigits: 0,
    })} میلیون تومان`;
  }

  return `${n.toLocaleString("fa-IR")} تومان`;
}

function statusClass(code?: string) {
  switch (code) {
    case "active":
      return "active";
    case "pending":
      return "pending";
    case "rejected":
      return "rejected";
    case "sold":
      return "sold";
    case "inactive":
    case "expired":
    case "deleted":
      return "inactive";
    default:
      return "pending";
  }
}

function makeLocalId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function uploadImageWithProgress(
  listingId: number,
  item: UploadItem,
  token: string,
  onProgress: (progress: number) => void
): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("POST", `${API_BASE}/api/upload-listing-image.php`);

    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      } else {
        onProgress(50);
      }
    };

    xhr.onload = () => {
      try {
        resolve(JSON.parse(xhr.responseText));
      } catch {
        reject(new Error("پاسخ سرور برای آپلود تصویر معتبر نبود."));
      }
    };

    xhr.onerror = () => {
      reject(new Error("ارتباط با سرور هنگام آپلود تصویر قطع شد."));
    };

    const formData = new FormData();
    formData.append("listing_id", String(listingId));
    formData.append("image", item.file);

    xhr.send(formData);
  });
}

export default function ListingManagePage() {
  const params = useParams<{ listingId: string }>();
  const listingId = Number(params?.listingId || 0);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [uploading, setUploading] = useState(false);
  const [coverLoadingId, setCoverLoadingId] = useState<number | null>(null);

  const [listing, setListing] = useState<ManagedListing | null>(null);
  const [images, setImages] = useState<ListingImage[]>([]);
  const [canManage, setCanManage] = useState(false);

  const [uploads, setUploads] = useState<UploadItem[]>([]);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadError, setUploadError] = useState("");

  async function loadListing() {
    if (!listingId) {
      setError("شناسه آگهی معتبر نیست.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const token = getToken();

      const res = await fetch(
        `${API_BASE}/api/listing-manage.php?listing_id=${encodeURIComponent(listingId)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      const json: ManageResponse = await res.json();

      if (!json.success) {
        setError(json.message || "اطلاعات آگهی دریافت نشد.");
        setListing(null);
        setImages([]);
        setCanManage(false);
        return;
      }

      setListing(json.listing || null);
      setImages(Array.isArray(json.images) ? json.images : []);
      setCanManage(Boolean(json.access?.can_manage));
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
      setListing(null);
      setImages([]);
      setCanManage(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadListing();
  }, [listingId]);

  async function runAction(action: string) {
    if (!listingId || !canManage) return;

    setActionLoading(action);
    setMessage("");
    setError("");

    try {
      const token = getToken();

      const res = await fetch(`${API_BASE}/api/listing-manage.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          listing_id: listingId,
          action,
        }),
      });

      const json = await res.json();

      if (!json.success) {
        setError(json.message || "عملیات انجام نشد.");
        return;
      }

      setMessage(json.message || "عملیات با موفقیت انجام شد.");
      await loadListing();
    } catch {
      setError("ارتباط با سرور برای انجام عملیات برقرار نشد.");
    } finally {
      setActionLoading("");
    }
  }

  async function setCoverImage(imageId: number) {
    if (!listingId || !imageId || !canManage) return;

    setCoverLoadingId(imageId);
    setUploadMessage("");
    setUploadError("");

    try {
      const token = getToken();

      const res = await fetch(`${API_BASE}/api/set-listing-cover-image.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          listing_id: listingId,
          image_id: imageId,
        }),
      });

      const json = await res.json();

      if (!json.success) {
        setUploadError(json.message || "تغییر عکس اصلی انجام نشد.");
        return;
      }

      setUploadMessage("عکس اصلی آگهی تغییر کرد.");
      await loadListing();
    } catch {
      setUploadError("ارتباط با سرور برای تغییر عکس اصلی برقرار نشد.");
    } finally {
      setCoverLoadingId(null);
    }
  }

  function handleImageSelect(files: FileList | null) {
    setUploadMessage("");
    setUploadError("");

    if (!files || files.length === 0) return;

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    const maxSize = 6 * 1024 * 1024;

    const validItems: UploadItem[] = [];

    for (const file of Array.from(files)) {
      if (!allowed.includes(file.type)) {
        setUploadError("فرمت تصویر باید JPG، PNG یا WEBP باشد.");
        continue;
      }

      if (file.size > maxSize) {
        setUploadError("حجم هر تصویر نباید بیشتر از ۶ مگابایت باشد.");
        continue;
      }

      validItems.push({
        localId: makeLocalId(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: "selected",
        progress: 0,
      });
    }

    setUploads((prev) => [...prev, ...validItems]);
  }

  function removeUpload(localId: string) {
    if (uploading) return;

    setUploads((prev) => {
      const found = prev.find((item) => item.localId === localId);

      if (found) {
        URL.revokeObjectURL(found.previewUrl);
      }

      return prev.filter((item) => item.localId !== localId);
    });
  }

  async function uploadSelectedImages() {
    if (!listingId || uploads.length === 0 || !canManage) return;

    setUploading(true);
    setUploadMessage("");
    setUploadError("");

    const token = getToken();
    let failed = 0;
    let uploaded = 0;

    for (const item of uploads) {
      if (item.status === "uploaded") continue;

      setUploads((prev) =>
        prev.map((upload) =>
          upload.localId === item.localId
            ? { ...upload, status: "uploading", progress: 5, error: "" }
            : upload
        )
      );

      try {
        const json = await uploadImageWithProgress(listingId, item, token, (progress) => {
          setUploads((prev) =>
            prev.map((upload) =>
              upload.localId === item.localId
                ? { ...upload, progress: Math.max(5, Math.min(progress, 99)) }
                : upload
            )
          );
        });

        if (json.success) {
          uploaded += 1;

          setUploads((prev) =>
            prev.map((upload) =>
              upload.localId === item.localId
                ? { ...upload, status: "uploaded", progress: 100, error: "" }
                : upload
            )
          );
        } else {
          failed += 1;

          setUploads((prev) =>
            prev.map((upload) =>
              upload.localId === item.localId
                ? {
                    ...upload,
                    status: "error",
                    progress: 0,
                    error: json.message || "آپلود تصویر انجام نشد.",
                  }
                : upload
            )
          );
        }
      } catch (err) {
        failed += 1;

        setUploads((prev) =>
          prev.map((upload) =>
            upload.localId === item.localId
              ? {
                  ...upload,
                  status: "error",
                  progress: 0,
                  error: err instanceof Error ? err.message : "آپلود تصویر انجام نشد.",
                }
              : upload
          )
        );
      }
    }

    setUploading(false);

    if (failed > 0) {
      setUploadError(`${failed} تصویر آپلود نشد.`);
    }

    if (uploaded > 0) {
      setUploadMessage(`${uploaded} تصویر با موفقیت آپلود شد.`);
      await loadListing();
    }
  }

  const coverImage = images.find((item) => item.is_cover) || images[0] || null;

  return (
    <main className="managePage" dir="rtl">
      <section className="shell">
        <header className="topbar">
          <a href="/dashboard" className="brand">
            <div className="logoMark">چ</div>
            <div>
              <strong>چاکود</strong>
              <span>مدیریت آگهی</span>
            </div>
          </a>

          <nav className="navLinks">
            <a href="/account">حساب</a>
            <a href="/dashboard">داشبورد</a>
            <a href="/submit">ثبت آگهی</a>
            <a href="/dealers">نمایشگاه</a>
          </nav>
        </header>

        {loading && (
          <div className="centerCard">
            <div className="loader" />
            <h1>در حال دریافت آگهی...</h1>
            <p>اطلاعات آگهی و تصاویر در حال آماده‌سازی است.</p>
          </div>
        )}

        {!loading && error && !listing && (
          <div className="centerCard">
            <span className="miniLabel">مدیریت آگهی</span>
            <h1>آگهی قابل مدیریت نیست</h1>
            <p>{error}</p>
            <div className="centerActions">
              <a className="primaryLink" href="/dashboard">
                بازگشت به داشبورد
              </a>
              <button className="secondaryBtn" onClick={loadListing}>
                تلاش دوباره
              </button>
            </div>
          </div>
        )}

        {!loading && listing && (
          <>
            <section className="hero">
              <div className="heroImage">
                {coverImage?.image_url ? (
                  <img src={coverImage.image_url} alt={listing.title} />
                ) : (
                  <span>بدون عکس اصلی</span>
                )}
              </div>

              <div className="heroInfo">
                <span className="miniLabel">آگهی شماره {formatNumber(listing.id)}</span>
                <h1>{listing.title || "آگهی بدون عنوان"}</h1>
                <p>
                  {[listing.brand, listing.model, listing.year].filter(Boolean).join("، ") ||
                    "مشخصات خودرو ثبت نشده"}
                </p>

                <div className="heroMeta">
                  <span>{formatPrice(listing.price_toman)}</span>
                  <span>{formatNumber(listing.mileage_km)} کیلومتر</span>
                  <span>
                    {[listing.province, listing.city, listing.neighborhood].filter(Boolean).join("، ") ||
                      "موقعیت ثبت نشده"}
                  </span>
                </div>

                <div className="ownerBox">
                  <b>{listing.listing_owner_type === "dealer" ? "آگهی نمایشگاهی" : "آگهی شخصی"}</b>
                  <span>{listing.seller_display_name || "چاکود"}</span>
                </div>
              </div>

              <div className="statusPanel">
                <span>وضعیت فعلی</span>
                <strong className={`statusBadge ${statusClass(listing.status?.code)}`}>
                  {listing.status?.title || "در انتظار بررسی"}
                </strong>
                <small>
                  {canManage
                    ? "شما اجازه مدیریت این آگهی را دارید."
                    : "شما فقط اجازه مشاهده این آگهی را دارید."}
                </small>
              </div>
            </section>

            <section className="statsGrid">
              <div className="statCard main">
                <span>تصاویر</span>
                <strong>{formatNumber(images.length)}</strong>
                <small>تعداد عکس‌های ثبت‌شده</small>
              </div>

              <div className="statCard">
                <span>نوع آگهی</span>
                <strong>{listing.listing_owner_type === "dealer" ? "نمایشگاهی" : "شخصی"}</strong>
                <small>مالکیت نمایشی آگهی</small>
              </div>

              <div className="statCard">
                <span>وضعیت</span>
                <strong>{listing.status?.title || "در انتظار"}</strong>
                <small>وضعیت انتشار آگهی</small>
              </div>

              <div className="statCard">
                <span>شناسه</span>
                <strong>{formatNumber(listing.id)}</strong>
                <small>شناسه داخلی آگهی</small>
              </div>
            </section>

            <section className="layoutGrid">
              <section className="mainColumn">
                <div className="panel">
                  <div className="panelHead">
                    <div>
                      <span>عملیات مدیریتی</span>
                      <h2>کنترل وضعیت آگهی</h2>
                    </div>
                  </div>

                  {!canManage && (
                    <div className="message hint">
                      شما اجازه تغییر وضعیت این آگهی را ندارید.
                    </div>
                  )}

                  {canManage && (
                    <div className="actionGrid">
                      <button
                        className="actionBtn sold"
                        disabled={Boolean(actionLoading)}
                        onClick={() => runAction("mark_sold")}
                      >
                        <strong>فروخته شد</strong>
                        <span>آگهی را از حالت فروش خارج کن</span>
                      </button>

                      <button
                        className="actionBtn inactive"
                        disabled={Boolean(actionLoading)}
                        onClick={() => runAction("disable_listing")}
                      >
                        <strong>غیرفعال‌سازی</strong>
                        <span>آگهی موقتاً از دسترس خارج شود</span>
                      </button>

                      <button
                        className="actionBtn review"
                        disabled={Boolean(actionLoading)}
                        onClick={() => runAction("reactivate_listing")}
                      >
                        <strong>ارسال دوباره برای بررسی</strong>
                        <span>آگهی بعد از اصلاح دوباره بررسی شود</span>
                      </button>

                      <button
                        className="actionBtn danger"
                        disabled={Boolean(actionLoading)}
                        onClick={() => runAction("delete_listing")}
                      >
                        <strong>حذف / بایگانی</strong>
                        <span>آگهی از چرخه نمایش خارج شود</span>
                      </button>
                    </div>
                  )}

                  {actionLoading && <div className="message hint">در حال انجام عملیات...</div>}
                  {message && <div className="message success">{message}</div>}
                  {error && <div className="message error">{error}</div>}
                </div>

                <div className="panel">
                  <div className="panelHead">
                    <div>
                      <span>تصاویر آگهی</span>
                      <h2>مدیریت عکس‌ها و عکس اصلی</h2>
                    </div>
                  </div>

                  {images.length === 0 && (
                    <div className="emptyBox">هنوز تصویری برای این آگهی ثبت نشده است.</div>
                  )}

                  {images.length > 0 && (
                    <div className="imageGrid">
                      {images.map((image) => (
                        <div className="imageCard" key={image.id}>
                          <img src={image.image_url} alt="تصویر آگهی" />

                          {image.is_cover && <b className="coverBadge">عکس اصلی</b>}

                          {canManage && !image.is_cover && (
                            <button
                              className="coverBtn"
                              disabled={coverLoadingId === image.id}
                              onClick={() => setCoverImage(image.id)}
                            >
                              {coverLoadingId === image.id ? "در حال تغییر..." : "انتخاب به عنوان اصلی"}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {canManage && (
                    <div className="uploadBox">
                      <label className="uploadPicker">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          onChange={(e) => {
                            handleImageSelect(e.target.files);
                            e.target.value = "";
                          }}
                          disabled={uploading}
                        />
                        <span>📸</span>
                        <strong>افزودن تصویر جدید</strong>
                        <small>JPG، PNG یا WEBP تا ۶ مگابایت</small>
                      </label>

                      {uploads.length > 0 && (
                        <div className="uploadPreviewGrid">
                          {uploads.map((item) => (
                            <div className={`uploadPreview ${item.status}`} key={item.localId}>
                              <img src={item.previewUrl} alt="تصویر انتخابی" />

                              {item.status === "selected" && (
                                <button onClick={() => removeUpload(item.localId)}>حذف</button>
                              )}

                              {item.status === "uploading" && (
                                <div className="uploadOverlay">
                                  <span>{formatNumber(item.progress)}٪</span>
                                  <em>
                                    <i style={{ width: `${item.progress}%` }} />
                                  </em>
                                </div>
                              )}

                              {item.status === "uploaded" && <b>آپلود شد</b>}
                              {item.status === "error" && <b className="bad">خطا</b>}
                            </div>
                          ))}
                        </div>
                      )}

                      {uploads.length > 0 && (
                        <button
                          className="primaryBtn"
                          disabled={uploading}
                          onClick={uploadSelectedImages}
                        >
                          {uploading ? "در حال آپلود..." : "آپلود تصاویر انتخاب‌شده"}
                        </button>
                      )}
                    </div>
                  )}

                  {uploadMessage && <div className="message success">{uploadMessage}</div>}
                  {uploadError && <div className="message error">{uploadError}</div>}
                </div>
              </section>

              <aside className="sideColumn">
                <div className="panel">
                  <div className="panelHead">
                    <div>
                      <span>مشخصات آگهی</span>
                      <h2>جزئیات ثبت‌شده</h2>
                    </div>
                  </div>

                  <div className="detailList">
                    <div>
                      <span>برند</span>
                      <b>{listing.brand || "ثبت نشده"}</b>
                    </div>
                    <div>
                      <span>مدل</span>
                      <b>{listing.model || "ثبت نشده"}</b>
                    </div>
                    <div>
                      <span>سال</span>
                      <b>{listing.year || "ثبت نشده"}</b>
                    </div>
                    <div>
                      <span>رنگ</span>
                      <b>{listing.color || "ثبت نشده"}</b>
                    </div>
                    <div>
                      <span>بدنه</span>
                      <b>{listing.body_status || "ثبت نشده"}</b>
                    </div>
                    <div>
                      <span>گیربکس</span>
                      <b>{listing.transmission || "ثبت نشده"}</b>
                    </div>
                    <div>
                      <span>سوخت</span>
                      <b>{listing.fuel_type || "ثبت نشده"}</b>
                    </div>
                    <div>
                      <span>موقعیت</span>
                      <b>
                        {listing.location_label ||
                          [listing.province, listing.city, listing.neighborhood].filter(Boolean).join("، ") ||
                          "ثبت نشده"}
                      </b>
                    </div>
                  </div>
                </div>

                <div className="panel">
                  <div className="panelHead">
                    <div>
                      <span>توضیحات</span>
                      <h2>متن آگهی</h2>
                    </div>
                  </div>

                  <p className="descriptionText">
                    {listing.description || "توضیحاتی برای این آگهی ثبت نشده است."}
                  </p>
                </div>

                <div className="panel">
                  <div className="panelHead">
                    <div>
                      <span>دسترسی سریع</span>
                      <h2>مسیرهای مدیریتی</h2>
                    </div>
                  </div>

                  <div className="quickLinks">
                    <a href="/dashboard">بازگشت به داشبورد</a>
                    <a href="/dashboard#recentListings">آگهی‌های اخیر</a>
                    <a href="/submit">ثبت آگهی جدید</a>
                    <a href="/dealers">نمایشگاه و تیم</a>
                  </div>
                </div>
              </aside>
            </section>
          </>
        )}
      </section>

      <nav className="mobileBottomNav" aria-label="منوی موبایل مدیریت آگهی">
        <a href="/dashboard">
          <span>📊</span>
          <b>داشبورد</b>
        </a>
        <a href="/submit">
          <span>＋</span>
          <b>ثبت آگهی</b>
        </a>
        <a href="/dealers">
          <span>🏢</span>
          <b>نمایشگاه</b>
        </a>
        <a href="/account">
          <span>👤</span>
          <b>حساب</b>
        </a>
      </nav>

      <style>{`
        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          background: #faf7ff;
        }

        .managePage {
          min-height: 100vh;
          font-family: Tahoma, Arial, sans-serif;
          color: #211335;
          background:
            radial-gradient(circle at 86% 8%, rgba(124, 58, 237, 0.18), transparent 34%),
            radial-gradient(circle at 8% 46%, rgba(168, 85, 247, 0.12), transparent 30%),
            linear-gradient(180deg, #ffffff 0%, #faf7ff 48%, #ffffff 100%);
          padding: 24px;
        }

        .shell {
          width: min(1240px, 100%);
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

        .logoMark {
          width: 48px;
          height: 48px;
          border-radius: 18px;
          background: linear-gradient(135deg, #6d28d9, #9333ea);
          color: #fff;
          display: grid;
          place-items: center;
          font-weight: 900;
          box-shadow: 0 14px 30px rgba(109, 40, 217, 0.24);
        }

        .brand strong {
          display: block;
          font-size: 18px;
        }

        .brand span {
          display: block;
          margin-top: 3px;
          color: #7b6a91;
          font-size: 12px;
        }

        .navLinks {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }

        .navLinks a {
          color: #6d28d9;
          background: rgba(255, 255, 255, 0.88);
          border: 1px solid #eadcff;
          border-radius: 999px;
          padding: 10px 14px;
          text-decoration: none;
          font-size: 13px;
          font-weight: bold;
        }

        .centerCard,
        .hero,
        .panel,
        .statCard {
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid #eadcff;
          box-shadow: 0 24px 70px rgba(76, 29, 149, 0.10);
          backdrop-filter: blur(12px);
        }

        .centerCard {
          width: min(620px, 100%);
          margin: 80px auto 0;
          text-align: center;
          border-radius: 34px;
          padding: 34px;
        }

        .hero {
          border-radius: 34px;
          padding: 24px;
          display: grid;
          grid-template-columns: 280px 1fr 240px;
          gap: 22px;
          align-items: center;
          margin-bottom: 20px;
        }

        .heroImage {
          height: 210px;
          border-radius: 26px;
          overflow: hidden;
          background: #f4ecff;
          display: grid;
          place-items: center;
          color: #8b5cf6;
        }

        .heroImage img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
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
          font-size: 32px;
          line-height: 1.45;
        }

        h2 {
          margin: 0;
          font-size: 20px;
          line-height: 1.7;
        }

        p {
          color: #6d5b83;
          line-height: 2.1;
          margin: 12px 0 0;
        }

        .heroMeta,
        .ownerBox {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 14px;
        }

        .heroMeta span,
        .ownerBox span,
        .ownerBox b {
          border: 1px solid #f0e7ff;
          background: #fbf8ff;
          color: #6d5b83;
          border-radius: 999px;
          padding: 7px 10px;
          font-size: 12px;
        }

        .ownerBox b {
          color: #6d28d9;
        }

        .statusPanel {
          border-radius: 26px;
          padding: 18px;
          background: linear-gradient(135deg, #3b0764, #7c3aed);
          color: #fff;
          display: grid;
          gap: 10px;
        }

        .statusPanel span {
          color: rgba(255, 255, 255, 0.82);
          font-size: 12px;
        }

        .statusPanel small {
          color: rgba(255, 255, 255, 0.78);
          line-height: 1.9;
        }

        .statusBadge {
          border-radius: 999px;
          padding: 8px 10px;
          font-size: 12px;
          font-style: normal;
          display: inline-block;
          width: fit-content;
        }

        .statusBadge.active {
          background: #dcfce7;
          color: #166534;
        }

        .statusBadge.pending {
          background: #fef3c7;
          color: #92400e;
        }

        .statusBadge.rejected {
          background: #ffe4e6;
          color: #be123c;
        }

        .statusBadge.sold {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .statusBadge.inactive {
          background: #f1f5f9;
          color: #475569;
        }

        .statsGrid {
          display: grid;
          grid-template-columns: 1.2fr repeat(3, 1fr);
          gap: 14px;
          margin-bottom: 20px;
        }

        .statCard {
          border-radius: 26px;
          padding: 22px;
        }

        .statCard.main {
          color: #fff;
          border-color: transparent;
          background:
            radial-gradient(circle at 90% 0%, rgba(255, 255, 255, 0.25), transparent 34%),
            linear-gradient(135deg, #6d28d9, #9333ea);
        }

        .statCard span {
          display: block;
          color: #7b6a91;
          font-size: 12px;
          margin-bottom: 10px;
        }

        .statCard.main span,
        .statCard.main small {
          color: rgba(255, 255, 255, 0.82);
        }

        .statCard strong {
          display: block;
          font-size: 26px;
          margin-bottom: 8px;
          line-height: 1.5;
        }

        .statCard small {
          color: #7b6a91;
          line-height: 1.8;
        }

        .layoutGrid {
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 20px;
          align-items: start;
        }

        .mainColumn,
        .sideColumn {
          display: grid;
          gap: 20px;
        }

        .panel {
          border-radius: 30px;
          padding: 26px;
          min-width: 0;
        }

        .panelHead {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 20px;
        }

        .panelHead span {
          display: inline-block;
          color: #6d28d9;
          background: #f4ecff;
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 11px;
          font-weight: bold;
          margin-bottom: 8px;
        }

        .actionGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        .actionBtn {
          border: 1px solid #eadcff;
          background: #fff;
          border-radius: 22px;
          padding: 16px;
          text-align: right;
          cursor: pointer;
          font-family: inherit;
          min-height: 116px;
        }

        .actionBtn strong {
          display: block;
          color: #211335;
          margin-bottom: 8px;
        }

        .actionBtn span {
          color: #7b6a91;
          font-size: 12px;
          line-height: 1.9;
        }

        .actionBtn.sold {
          background: #eff6ff;
          border-color: #bfdbfe;
        }

        .actionBtn.inactive {
          background: #f8fafc;
          border-color: #e2e8f0;
        }

        .actionBtn.review {
          background: #fffbeb;
          border-color: #fde68a;
        }

        .actionBtn.danger {
          background: #fff1f2;
          border-color: #fecdd3;
        }

        .actionBtn:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .imageGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        .imageCard {
          position: relative;
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid #eadcff;
          background: #fff;
          aspect-ratio: 1 / 1;
        }

        .imageCard img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .coverBadge {
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(22, 101, 52, 0.94);
          color: #fff;
          border-radius: 999px;
          padding: 7px 10px;
          font-size: 11px;
        }

        .coverBtn {
          position: absolute;
          right: 8px;
          bottom: 8px;
          left: 8px;
          border: 0;
          border-radius: 999px;
          padding: 9px 10px;
          background: rgba(109, 40, 217, 0.94);
          color: #fff;
          font-family: inherit;
          cursor: pointer;
          font-size: 11px;
          font-weight: bold;
        }

        .uploadBox {
          margin-top: 18px;
          border: 1px dashed #d7c2ff;
          background: #fbf8ff;
          border-radius: 24px;
          padding: 16px;
        }

        .uploadPicker {
          display: grid;
          place-items: center;
          text-align: center;
          border: 1px solid #eadcff;
          background: #fff;
          border-radius: 20px;
          padding: 22px;
          cursor: pointer;
        }

        .uploadPicker input {
          display: none;
        }

        .uploadPicker span {
          font-size: 28px;
          margin-bottom: 8px;
        }

        .uploadPicker strong {
          color: #211335;
          margin-bottom: 5px;
        }

        .uploadPicker small {
          color: #7b6a91;
        }

        .uploadPreviewGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-top: 14px;
        }

        .uploadPreview {
          position: relative;
          border-radius: 16px;
          overflow: hidden;
          aspect-ratio: 1 / 1;
          border: 1px solid #eadcff;
        }

        .uploadPreview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .uploadPreview button,
        .uploadPreview b {
          position: absolute;
          right: 7px;
          bottom: 7px;
          border: 0;
          border-radius: 999px;
          padding: 6px 9px;
          font-size: 10px;
          background: rgba(190, 18, 60, 0.94);
          color: #fff;
          font-family: inherit;
        }

        .uploadPreview b {
          background: rgba(22, 101, 52, 0.94);
        }

        .uploadPreview b.bad {
          background: rgba(190, 18, 60, 0.94);
        }

        .uploadOverlay {
          position: absolute;
          inset: 0;
          background: rgba(36, 18, 61, 0.46);
          display: grid;
          place-items: center;
          color: #fff;
          padding: 10px;
        }

        .uploadOverlay em {
          width: 80%;
          height: 6px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.28);
        }

        .uploadOverlay i {
          display: block;
          height: 100%;
          background: #fff;
        }

        .primaryBtn,
        .primaryLink,
        .secondaryBtn {
          border: 0;
          border-radius: 17px;
          padding: 13px 16px;
          font-weight: bold;
          font-size: 14px;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          text-align: center;
          font-family: inherit;
        }

        .primaryBtn,
        .primaryLink {
          color: #fff;
          background: linear-gradient(135deg, #6d28d9, #9333ea);
        }

        .primaryBtn {
          width: 100%;
          margin-top: 14px;
        }

        .secondaryBtn {
          color: #6d28d9;
          background: #f4ecff;
          border: 1px solid #e4d4ff;
        }

        .detailList {
          display: grid;
          gap: 11px;
        }

        .detailList div {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          border-bottom: 1px solid #f0e7ff;
          padding-bottom: 10px;
        }

        .detailList span {
          color: #7b6a91;
          font-size: 12px;
        }

        .detailList b {
          color: #211335;
          font-size: 12px;
          text-align: left;
          line-height: 1.8;
        }

        .descriptionText {
          color: #4c3b64;
          font-size: 13px;
          line-height: 2.2;
        }

        .quickLinks {
          display: grid;
          gap: 10px;
        }

        .quickLinks a {
          color: #6d28d9;
          background: #f4ecff;
          border: 1px solid #e4d4ff;
          border-radius: 999px;
          padding: 12px 14px;
          text-decoration: none;
          text-align: center;
          font-size: 13px;
          font-weight: bold;
        }

        .centerActions {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-top: 18px;
          flex-wrap: wrap;
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

        .hint {
          background: #fffbeb;
          color: #92400e;
          border: 1px solid #fde68a;
        }

        .emptyBox {
          border: 1px dashed #d7c2ff;
          background: #fbf8ff;
          color: #7b6a91;
          border-radius: 22px;
          padding: 22px;
          text-align: center;
          line-height: 2;
          font-size: 13px;
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

        .mobileBottomNav {
          display: none;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 1120px) {
          .hero,
          .layoutGrid {
            grid-template-columns: 1fr;
          }

          .statsGrid,
          .actionGrid {
            grid-template-columns: repeat(2, 1fr);
          }

          .heroImage {
            height: 320px;
          }
        }

        @media (max-width: 760px) {
          .managePage {
            padding: 12px;
            padding-bottom: 94px;
          }

          .shell {
            width: 100%;
          }

          .topbar {
            position: sticky;
            top: 8px;
            z-index: 30;
            align-items: flex-start;
            flex-direction: column;
            gap: 10px;
            background: rgba(255, 255, 255, 0.86);
            backdrop-filter: blur(14px);
            border: 1px solid #eadcff;
            border-radius: 22px;
            padding: 10px;
            margin-bottom: 14px;
            box-shadow: 0 14px 40px rgba(76, 29, 149, 0.10);
          }

          .brand .logoMark {
            width: 42px;
            height: 42px;
            border-radius: 16px;
          }

          .brand strong {
            font-size: 16px;
          }

          .brand span {
            font-size: 11px;
          }

          .navLinks {
            width: 100%;
            overflow-x: auto;
            flex-wrap: nowrap;
            padding-bottom: 2px;
            scrollbar-width: none;
          }

          .navLinks::-webkit-scrollbar {
            display: none;
          }

          .navLinks a {
            white-space: nowrap;
            padding: 9px 12px;
            font-size: 12px;
            min-height: 38px;
            display: inline-flex;
            align-items: center;
          }

          .centerCard,
          .hero,
          .panel,
          .statCard {
            border-radius: 24px;
            padding: 20px;
          }

          .centerCard {
            margin: 44px auto 0;
          }

          h1 {
            font-size: 26px;
          }

          h2 {
            font-size: 17px;
          }

          p {
            font-size: 13px;
            line-height: 2;
          }

          .hero {
            gap: 14px;
            margin-bottom: 14px;
          }

          .heroImage {
            height: 210px;
            border-radius: 22px;
          }

          .statusPanel {
            border-radius: 22px;
          }

          .statsGrid {
            display: flex;
            overflow-x: auto;
            gap: 10px;
            padding: 2px 2px 8px;
            margin-bottom: 14px;
            scroll-snap-type: x mandatory;
            scrollbar-width: none;
          }

          .statsGrid::-webkit-scrollbar {
            display: none;
          }

          .statCard {
            min-width: 210px;
            scroll-snap-align: start;
          }

          .layoutGrid,
          .mainColumn,
          .sideColumn {
            gap: 14px;
          }

          .actionGrid {
            grid-template-columns: 1fr;
          }

          .actionBtn {
            min-height: auto;
          }

          .imageGrid,
          .uploadPreviewGrid {
            grid-template-columns: repeat(2, 1fr);
          }

          .detailList div {
            align-items: flex-start;
            flex-direction: column;
          }

          .mobileBottomNav {
            position: fixed;
            right: 12px;
            left: 12px;
            bottom: 12px;
            z-index: 80;
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            padding: 8px;
            border-radius: 24px;
            background: rgba(255, 255, 255, 0.92);
            border: 1px solid #eadcff;
            box-shadow: 0 18px 50px rgba(76, 29, 149, 0.18);
            backdrop-filter: blur(16px);
          }

          .mobileBottomNav a {
            text-decoration: none;
            color: #6d28d9;
            display: grid;
            place-items: center;
            gap: 3px;
            border-radius: 18px;
            padding: 8px 4px;
            min-height: 54px;
            background: #fbf8ff;
            border: 1px solid #f0e7ff;
            -webkit-tap-highlight-color: transparent;
          }

          .mobileBottomNav span {
            font-size: 18px;
            line-height: 1;
          }

          .mobileBottomNav b {
            font-size: 10px;
            line-height: 1.5;
          }
        }
      `}</style>
    </main>
  );
}