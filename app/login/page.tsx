"use client";

import Link from "next/link";
import { type ChangeEvent, useEffect, useState } from "react";

import { createLocalDevelopmentSession } from "../../lib/local-development-login";
import { safeReturnTo } from "./return-to";

const RESEND_SECONDS = 90;
const WELCOME_SPLASH_MS = 2600;
const LOCAL_DEV_SESSION_MARKER = "chakod-local-dev-session";
const IS_LOCAL_DEV = process.env.NODE_ENV === "development";

type Step = "mobile" | "code" | "done";

type LoginUser = {
  id?: number;
  mobile?: string;
  full_name?: string | null;
  account_type?: "personal" | "dealer" | "parts_store" | "repair_shop" | "business";
  business_name?: string | null;
  business_city?: string | null;
  display_name?: string;
  profile_completed?: boolean;
  phone_verified?: boolean;
  mobile_verified?: boolean;
  terms_accepted?: boolean;
  accepted_terms?: boolean;
};

function toEnglishDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function normalizeMobile(value: string) {
  let mobile = toEnglishDigits(value.trim());
  mobile = mobile.replace(/[\s\-_\(\)]/g, "");

  if (mobile.startsWith("+98")) {
    mobile = "0" + mobile.slice(3);
  } else if (mobile.startsWith("98") && mobile.length === 12) {
    mobile = "0" + mobile.slice(2);
  }

  return mobile;
}

function normalizeCode(value: string) {
  return toEnglishDigits(value).replace(/\D/g, "").slice(0, 6);
}

function formatCountdown(seconds: number) {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function isProfileComplete(user?: LoginUser | null) {
  if (!user) return false;

  const fullNameOk = Boolean(user.full_name && user.full_name.trim().length >= 2);
  const type = user.account_type || "personal";

  if (!fullNameOk || type === "business") return false;

  if (type !== "personal") {
    const businessNameOk = Boolean(
      user.business_name && user.business_name.trim().length >= 2,
    );
    const businessCityOk = Boolean(
      user.business_city && user.business_city.trim().length >= 2,
    );
    return businessNameOk && businessCityOk;
  }

  return true;
}

async function readApiResponse(res: Response) {
  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch {
    return {
      success: false,
      message: "پاسخ سرور معتبر نیست. لطفاً دوباره تلاش کنید.",
    };
  }
}

export default function LoginPage() {
  const [step, setStep] = useState<Step>("mobile");
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);

  const normalizedMobile = normalizeMobile(mobile);
  const normalizedCode = normalizeCode(code);

  const canSend = /^09[0-9]{9}$/.test(normalizedMobile) && accepted;
  const canVerify = /^[0-9]{5}$/.test(normalizedCode);
  const canResend = canSend && resendCountdown === 0 && !loading;

  function postLoginDestination(fallback = "/") {
    const requestedPath = new URLSearchParams(window.location.search).get("returnTo");
    return safeReturnTo(requestedPath, fallback);
  }

  useEffect(() => {
    if (resendCountdown <= 0) return;

    const timer = window.setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendCountdown]);

  async function loginForLocalDevelopment() {
    if (!IS_LOCAL_DEV || loading) return;

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const session = await createLocalDevelopmentSession();

      if (!session.success) {
        setError(session.message);
        return;
      }

      const devUser: LoginUser = {
        id: 0,
        mobile: "09120000000",
        full_name: null,
        account_type: "personal",
        business_name: null,
        business_city: null,
        display_name: "کاربر آزمایشی چاکود",
        profile_completed: false,
        phone_verified: true,
        mobile_verified: true,
        terms_accepted: true,
        accepted_terms: true,
      };

      localStorage.setItem("chakod_session_token", LOCAL_DEV_SESSION_MARKER);
      localStorage.setItem("chakod_user", JSON.stringify(devUser));
      localStorage.setItem(
        "chakod_identity",
        JSON.stringify({
          primary_role: "user",
          role_title: "کاربر آزمایشی",
          redirect_to: session.redirectTo,
          roles: ["user"],
          permissions: [],
          is_site_owner: false,
          local_development: true,
        }),
      );
      window.dispatchEvent(new Event("chakod:auth-changed"));
      setMessage("ورود آزمایشی موفق بود. در حال انتقال...");
      window.location.assign(postLoginDestination(session.redirectTo));
    } catch {
      setError("ورود آزمایشی لوکال انجام نشد. دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  }

  async function sendCode(isResend = false) {
    if (!canSend || loading) return;
    if (isResend && resendCountdown > 0) return;

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mobile: normalizedMobile,
          accept_terms: accepted,
        }),
      });

      const json = await readApiResponse(res);

      if (!json.success) {
        setError(
          json.message ||
            "ارسال کد تأیید ناموفق بود. لطفاً چند دقیقه بعد دوباره تلاش کنید.",
        );
        return;
      }

      setCode("");
      setMessage(json.message || "کد تأیید ارسال شد.");
      setResendCountdown(RESEND_SECONDS);
      setStep("code");
    } catch {
      setError("ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    if (!canVerify || loading) return;

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 15000);

      let res: Response;

      try {
        res = await fetch("/api/auth/verify", {
          method: "POST",
          credentials: "include",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mobile: normalizedMobile,
            code: normalizedCode,
          }),
        });
      } finally {
        window.clearTimeout(timeoutId);
      }

      const json = await readApiResponse(res);

      if (!json.success) {
        setError(json.message || "کد تأیید صحیح نیست.");
        setMessage("");
        return;
      }

      if (json.session_token) {
        localStorage.setItem("chakod_session_token", json.session_token);
      }

      if (json.user) {
        localStorage.setItem("chakod_user", JSON.stringify(json.user));
      }

      localStorage.setItem(
        "chakod_identity",
        JSON.stringify({
          primary_role: json.primary_role,
          role_title: json.role_title,
          redirect_to: json.redirect_to,
          roles: Array.isArray(json.roles) ? json.roles : [],
          permissions: Array.isArray(json.permissions) ? json.permissions : [],
          is_site_owner: Boolean(json.is_site_owner),
        }),
      );
      window.dispatchEvent(new Event("chakod:auth-changed"));

      const defaultNextUrl = isProfileComplete(json.user)
        ? safeReturnTo(json.redirect_to)
        : "/account?complete=1";
      const nextUrl = postLoginDestination(defaultNextUrl);

      setMessage("");
      setStep("done");

      window.setTimeout(() => {
        window.location.replace(nextUrl);
      }, WELCOME_SPLASH_MS);
    } catch (caughtError) {
      const isTimeout =
        caughtError instanceof DOMException && caughtError.name === "AbortError";

      setError(
        isTimeout
          ? "پاسخ سرور طول کشید. دوباره روی تأیید و ورود بزنید."
          : "ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.",
      );
      setMessage("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="loginPage" dir="rtl">
      <section className="loginShell">
        <div className="topbar">
          <Link href="/" className="homeLink">
            صفحه اصلی
          </Link>

          <Link className="brand" href="/" aria-label="صفحه اصلی چاکود">
            <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
          </Link>
        </div>

        <div className="card">
          {step === "mobile" && (
            <>
              <span className="miniLabel">ورود به چاکود</span>
              <h1>شماره موبایل خود را وارد کنید</h1>

              <p>
                برای ورود، ثبت آگهی و مدیریت حساب کاربری، شماره موبایل خود را
                وارد کنید. ارسال کد فقط پس از پذیرش قوانین فعال می‌شود.
              </p>

              <label className="field">
                <span>شماره موبایل</span>
                <input
                  className="normalInput"
                  value={mobile}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setMobile(event.target.value)
                  }
                  placeholder="مثلاً 09123456789"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </label>

              <label className="termsBox">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setAccepted(event.target.checked)
                  }
                />
                <span>
                  قوانین ثبت آگهی، شرایط استفاده، حریم خصوصی و سیاست پرداخت
                  چاکود را مطالعه کرده‌ام و می‌پذیرم.
                  <a href="/rules" target="_blank" rel="noreferrer">
                    مشاهده قوانین
                  </a>
                </span>
              </label>

              <button
                className="primaryBtn"
                disabled={!canSend || loading}
                onClick={() => sendCode(false)}
              >
                {loading
                  ? "در حال ارسال..."
                  : accepted
                    ? "ارسال کد تأیید"
                    : "ابتدا قوانین را بپذیرید"}
              </button>

              {IS_LOCAL_DEV && (
                <div className="devLoginBox">
                  <span>حالت توسعه محلی</span>
                  <p>برای تست صفحه حساب، بدون پیامک وارد حساب آزمایشی شوید.</p>
                  <button
                    type="button"
                    className="devLoginBtn"
                    disabled={loading}
                    onClick={loginForLocalDevelopment}
                  >
                    {loading ? "در حال ورود..." : "ورود آزمایشی لوکال"}
                  </button>
                </div>
              )}

              {!/^09[0-9]{9}$/.test(normalizedMobile) && mobile.trim() && (
                <div className="message hintMessage">
                  شماره موبایل باید با 09 شروع شود و ۱۱ رقم باشد.
                </div>
              )}
            </>
          )}

          {step === "code" && (
            <>
              <span className="miniLabel">کد تأیید</span>
              <h1>کد پیامکی را وارد کنید</h1>

              <p>
                کد تأیید برای شماره {normalizedMobile} ارسال شد. بعد از وارد
                کردن کامل کد، روی دکمه «تأیید و ورود» بزنید.
              </p>

              <label className="field">
                <span>کد تأیید</span>
                <input
                  className="codeInput"
                  value={code}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    setCode(normalizeCode(event.target.value));
                    setError("");
                    setMessage("");
                  }}
                  placeholder="-----"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                />
              </label>

              <button
                className="primaryBtn"
                disabled={!canVerify || loading}
                onClick={verifyCode}
              >
                {loading
                  ? "در حال تأیید..."
                  : canVerify
                    ? "تأیید و ورود"
                    : "کد را وارد کنید"}
              </button>

              <div className="resendBox">
                {resendCountdown > 0 ? (
                  <span>
                    ارسال مجدد کد تا{" "}
                    <strong>{formatCountdown(resendCountdown)}</strong>
                  </span>
                ) : (
                  <button
                    className="resendBtn"
                    disabled={!canResend}
                    onClick={() => sendCode(true)}
                  >
                    ارسال مجدد کد تأیید
                  </button>
                )}
              </div>

              <button
                className="linkBtn"
                disabled={loading}
                onClick={() => {
                  setStep("mobile");
                  setCode("");
                  setMessage("");
                  setError("");
                  setResendCountdown(0);
                }}
              >
                تغییر شماره موبایل
              </button>
            </>
          )}

          {step === "done" && (
            <div className="doneBox" aria-hidden="true">
              <div className="doneIcon">✓</div>
              <h1>ورود موفق بود</h1>
              <p>در حال آماده‌سازی چاکود برای شما...</p>
            </div>
          )}

          {message && <div className="message success">{message}</div>}
          {error && <div className="message error">{error}</div>}
        </div>
      </section>

      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #faf7ff;
        }

        .loginPage {
          min-height: 100vh;
          font-family: Tahoma, Arial, sans-serif;
          color: #211335;
          background:
            radial-gradient(circle at 84% 10%, rgba(123, 44, 255, 0.16), transparent 32%),
            linear-gradient(180deg, #ffffff 0%, #faf7ff 52%, #ffffff 100%);
          padding: 24px;
        }

        .loginShell {
          width: min(920px, 100%);
          margin: 0 auto;
        }

        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 70px;
        }

        .brand {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 152px;
          min-height: 52px;
          text-decoration: none;
        }

        .brand img {
          display: block;
          width: 100%;
          height: auto;
          object-fit: contain;
        }

        .homeLink {
          color: #6d28d9;
          background: #fff;
          border: 1px solid #eadcff;
          border-radius: 999px;
          padding: 10px 18px;
          text-decoration: none;
          font-size: 13px;
          font-weight: bold;
        }

        .card {
          width: min(560px, 100%);
          margin: 0 auto;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid #eadcff;
          border-radius: 34px;
          padding: 34px;
          box-shadow: 0 24px 70px rgba(76, 29, 149, 0.12);
          text-align: center;
        }

        .miniLabel {
          display: inline-block;
          color: #6d28d9;
          background: #f4ecff;
          border: 1px solid #e4d4ff;
          border-radius: 999px;
          padding: 7px 13px;
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 16px;
        }

        h1 {
          margin: 0;
          font-size: 31px;
          line-height: 1.45;
          color: #24123d;
        }

        p {
          color: #6d5b83;
          line-height: 2.1;
          margin: 16px 0 22px;
          font-size: 14px;
        }

        .field {
          display: block;
          margin-bottom: 16px;
          text-align: right;
        }

        .field span {
          display: block;
          color: #6b5b82;
          font-size: 13px;
          margin-bottom: 8px;
        }

        .field input {
          width: 100%;
          border: 1px solid #e2d3ff;
          border-radius: 18px;
          padding: 15px;
          font-size: 16px;
          outline: 0;
          color: #24123d;
          background: #fff;
        }

        .field input:focus {
          border-color: #8b5cf6;
          box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.12);
        }

        .normalInput {
          direction: ltr;
          text-align: left;
        }

        .codeInput {
          direction: ltr;
          text-align: center;
          letter-spacing: 8px;
          font-size: 22px !important;
          font-weight: 900;
        }

        .termsBox {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          background: #faf7ff;
          border: 1px solid #eadcff;
          border-radius: 18px;
          padding: 14px;
          margin-bottom: 16px;
          color: #5d4b76;
          line-height: 1.9;
          font-size: 13px;
          text-align: right;
        }

        .termsBox input {
          margin-top: 7px;
          width: 18px;
          height: 18px;
          accent-color: #6d28d9;
        }

        .termsBox a {
          display: inline-block;
          color: #6d28d9;
          font-weight: bold;
          text-decoration: none;
          margin-right: 6px;
        }

        .primaryBtn {
          width: 100%;
          border: 0;
          border-radius: 17px;
          padding: 14px 16px;
          color: #fff;
          background: linear-gradient(135deg, #6d28d9, #9333ea);
          font-weight: bold;
          font-size: 14px;
          cursor: pointer;
          display: inline-block;
          text-align: center;
        }

        .primaryBtn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .devLoginBox {
          margin-top: 16px;
          padding: 16px;
          border: 1px dashed #c4b5fd;
          border-radius: 18px;
          background: #faf7ff;
          text-align: right;
        }

        .devLoginBox > span {
          display: inline-flex;
          color: #6d28d9;
          font-size: 12px;
          font-weight: 900;
        }

        .devLoginBox p {
          margin: 7px 0 12px;
          color: #6d5b83;
          font-size: 12px;
          line-height: 1.8;
        }

        .devLoginBtn {
          width: 100%;
          min-height: 44px;
          border: 1px solid #8b5cf6;
          border-radius: 14px;
          color: #6d28d9;
          background: #fff;
          font: inherit;
          font-weight: 900;
          cursor: pointer;
        }

        .devLoginBtn:disabled,
        .linkBtn:disabled,
        .resendBtn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .linkBtn {
          width: 100%;
          border: 0;
          background: transparent;
          color: #6d28d9;
          font-weight: bold;
          margin-top: 14px;
          cursor: pointer;
        }

        .resendBox {
          margin-top: 14px;
          background: #faf7ff;
          border: 1px solid #eadcff;
          border-radius: 16px;
          padding: 13px;
          text-align: center;
          color: #6d5b83;
          font-size: 13px;
        }

        .resendBox strong {
          color: #6d28d9;
          direction: ltr;
          display: inline-block;
        }

        .resendBtn {
          border: 0;
          background: transparent;
          color: #6d28d9;
          font-weight: bold;
          cursor: pointer;
          font-size: 13px;
        }

        .message {
          margin-top: 16px;
          border-radius: 16px;
          padding: 13px;
          font-size: 13px;
          line-height: 1.9;
          text-align: center;
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

        .doneIcon {
          width: 64px;
          height: 64px;
          border-radius: 22px;
          display: grid;
          place-items: center;
          background: #f4ecff;
          color: #6d28d9;
          font-size: 30px;
          font-weight: 900;
          margin: 0 auto 16px;
        }

        @media (max-width: 520px) {
          .loginPage {
            padding: 14px;
          }

          .topbar {
            margin-bottom: 38px;
          }

          .brand {
            width: 126px;
            min-height: 44px;
          }

          .card {
            padding: 24px;
            border-radius: 26px;
          }

          h1 {
            font-size: 25px;
          }
        }
      `}</style>
    </main>
  );
}
