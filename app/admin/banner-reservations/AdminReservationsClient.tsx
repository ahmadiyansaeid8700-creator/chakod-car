"use client";

import { useEffect, useState } from "react";
import { BUSINESS_TYPES, formatToman } from "../../../lib/banner-booking";

type Reservation = {
  id: number;
  ownerEmail: string;
  businessName: string;
  businessType: keyof typeof BUSINESS_TYPES;
  campaignTitle: string;
  destinationUrl: string;
  cities: string[];
  startDate: string;
  endDate: string;
  totalPrice: number;
  paymentStatus: string;
  reviewStatus: string;
  adminNote: string;
  createdAt: string;
};

const statusLabels: Record<string, string> = {
  pending: "در انتظار بررسی",
  approved: "تأیید شده",
  rejected: "رد یا نیازمند اصلاح",
};

export default function AdminReservationsClient() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<Record<number, string>>({});

  useEffect(() => {
    let active = true;
    void fetch("/api/admin/banner-reservations", { cache: "no-store" })
      .then(async (response) => ({
        ok: response.ok,
        data: (await response.json()) as {
          reservations?: Reservation[];
          error?: string;
        },
      }))
      .then(({ ok, data }) => {
        if (!active) return;
        if (!ok) setError(data.error ?? "دریافت رزروها انجام نشد.");
        else setReservations(data.reservations ?? []);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function updateReservation(
    id: number,
    reviewStatus: "approved" | "rejected",
  ) {
    setError("");
    const response = await fetch("/api/admin/banner-reservations", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id,
        reviewStatus,
        adminNote: notes[id] ?? "",
      }),
    });
    const data = (await response.json()) as {
      reservation?: Reservation;
      error?: string;
    };
    if (!response.ok || !data.reservation) {
      setError(data.error ?? "تغییر وضعیت انجام نشد.");
      return;
    }
    setReservations((current) =>
      current.map((item) => (item.id === id ? { ...item, ...data.reservation } : item)),
    );
  }

  const visible =
    filter === "all"
      ? reservations
      : reservations.filter((item) => item.reviewStatus === filter);

  return (
    <div className="dashboardContent">
      <section className="dashboardIntro">
        <div>
          <span>مدیریت تبلیغات</span>
          <h1>درخواست‌های رزرو بنر شهری</h1>
          <p>
            پرداخت، شهرها، تاریخ و متن کمپین را بررسی کنید؛ فقط رزروهای
            تأییدشده در جایگاه زیر استوری‌ها نمایش داده می‌شوند.
          </p>
        </div>
      </section>

      <div className="adminStats">
        <div>
          <span>در انتظار</span>
          <strong>
            {new Intl.NumberFormat("fa-IR").format(
              reservations.filter((item) => item.reviewStatus === "pending").length,
            )}
          </strong>
        </div>
        <div>
          <span>تأییدشده</span>
          <strong>
            {new Intl.NumberFormat("fa-IR").format(
              reservations.filter((item) => item.reviewStatus === "approved").length,
            )}
          </strong>
        </div>
        <div>
          <span>مجموع پرداخت آزمایشی</span>
          <strong>
            {formatToman(
              reservations.reduce((total, item) => total + item.totalPrice, 0),
            )}
          </strong>
        </div>
      </div>

      <div className="adminFilters">
        {[
          ["pending", "در انتظار بررسی"],
          ["approved", "تأییدشده"],
          ["rejected", "ردشده"],
          ["all", "همه"],
        ].map(([value, label]) => (
          <button
            type="button"
            key={value}
            className={filter === value ? "selected" : ""}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="formMessage errorMessage">{error}</p>}
      {loading ? (
        <div className="emptyState">در حال دریافت درخواست‌ها...</div>
      ) : visible.length ? (
        <div className="adminReservationGrid">
          {visible.map((reservation) => (
            <article className="adminReservationCard" key={reservation.id}>
              <div className="adminReservationTop">
                <div>
                  <span>{BUSINESS_TYPES[reservation.businessType]}</span>
                  <h2>{reservation.campaignTitle}</h2>
                  <p>{reservation.businessName}</p>
                </div>
                <span className={`statusPill statusPill--${reservation.reviewStatus}`}>
                  {statusLabels[reservation.reviewStatus]}
                </span>
              </div>
              <dl>
                <div>
                  <dt>مالک حساب</dt>
                  <dd dir="ltr">{reservation.ownerEmail}</dd>
                </div>
                <div>
                  <dt>شهرهای هدف</dt>
                  <dd>{reservation.cities.join("، ")}</dd>
                </div>
                <div>
                  <dt>زمان نمایش</dt>
                  <dd>
                    {reservation.startDate} تا {reservation.endDate}
                  </dd>
                </div>
                <div>
                  <dt>مبلغ پرداختی</dt>
                  <dd>{formatToman(reservation.totalPrice)}</dd>
                </div>
              </dl>
              {reservation.destinationUrl && (
                <a
                  className="campaignLink"
                  href={reservation.destinationUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  بررسی لینک مقصد ↗
                </a>
              )}
              <label className="fieldLabel">
                یادداشت مدیریت
                <textarea
                  value={notes[reservation.id] ?? reservation.adminNote}
                  onChange={(event) =>
                    setNotes((current) => ({
                      ...current,
                      [reservation.id]: event.target.value,
                    }))
                  }
                  placeholder="دلیل رد یا توضیح تأیید"
                />
              </label>
              <div className="adminActions">
                <button
                  type="button"
                  className="approveButton"
                  onClick={() => updateReservation(reservation.id, "approved")}
                >
                  تأیید و زمان‌بندی
                </button>
                <button
                  type="button"
                  className="rejectButton"
                  onClick={() => updateReservation(reservation.id, "rejected")}
                >
                  رد درخواست
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="emptyState">در این وضعیت درخواستی وجود ندارد.</div>
      )}
    </div>
  );
}
