"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { formatDualDate } from "../../../lib/date-display";
import MobileBottomNav from "../../components/MobileBottomNav";
import styles from "./page.module.css";

type WalletSummary = {
  available_balance_toman: number;
  blocked_balance_toman: number;
  status: string;
};

type WalletTransaction = {
  id: number;
  direction: string;
  transactionType: string;
  amountToman: number;
  balanceAfterToman: number;
  status: string;
  description: string;
  createdAt: string;
};

type CreditBalance = {
  asset_code: string;
  available_quantity: number;
};

type CreditTransaction = {
  id: number;
  asset_code: string;
  quantity_delta: number;
  transaction_type: string;
  reference_type: string;
  reference_id: string;
  created_at: string;
};

type FinanceSummaryResponse = {
  success?: boolean;
  message?: string;
  wallet?: WalletSummary;
  credit_balances?: CreditBalance[];
  credit_transactions?: CreditTransaction[];
  transactions?: WalletTransaction[];
};

type TransferAccount = {
  scope: string;
  kind: "personal" | "activity";
  id: number | null;
  type: string;
  name: string;
};

type TransferInfoResponse = {
  success?: boolean;
  message?: string;
  source?: TransferAccount;
  targets?: TransferAccount[];
};

type TransferResponse = {
  success?: boolean;
  message?: string;
  available_balance_toman?: number;
};

type CreditTransferResponse = {
  success?: boolean;
  message?: string;
  available_quantity?: number;
};

const statusTitles: Record<string, string> = {
  active: "فعال",
  disabled: "غیرفعال",
  completed: "تکمیل‌شده",
  reserved: "در حال پردازش",
  failed: "ناموفق",
};

const creditTransactionTitles: Record<string, string> = {
  purchase: "خرید اعتبار استوری",
  consume: "مصرف برای انتشار استوری",
  transfer_out: "انتقال اعتبار به حساب دیگر",
  transfer_in: "دریافت اعتبار از حساب دیگر",
  refund: "بازگشت اعتبار",
  admin_adjustment: "اصلاح اعتبار توسط مدیریت",
};

function formatToman(value: number) {
  return `${new Intl.NumberFormat("fa-IR").format(Number(value || 0))} تومان`;
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("fa-IR").format(Number(value || 0));
}

function formatDate(value?: string) {
  return value ? formatDualDate(value, true) : "";
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("chakod_session_token") || "";
  return token
    ? { Authorization: `Bearer ${token}`, "X-Session-Token": token }
    : {};
}

async function readJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  try {
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}

function normalizeDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[^0-9]/g, "");
}

export default function WalletClient() {
  const [summary, setSummary] = useState<FinanceSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [transferInfo, setTransferInfo] = useState<TransferInfoResponse | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferLoading, setTransferLoading] = useState(true);
  const [transferWorking, setTransferWorking] = useState(false);
  const [transferError, setTransferError] = useState("");
  const [transferNotice, setTransferNotice] = useState("");
  const [destinationScope, setDestinationScope] = useState("");
  const [amount, setAmount] = useState("");
  const [creditTransferOpen, setCreditTransferOpen] = useState(false);
  const [creditTransferWorking, setCreditTransferWorking] = useState(false);
  const [creditTransferError, setCreditTransferError] = useState("");
  const [creditTransferNotice, setCreditTransferNotice] = useState("");
  const [creditDestinationScope, setCreditDestinationScope] = useState("");
  const [creditQuantity, setCreditQuantity] = useState("");

  async function loadWallet() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/finance/summary", {
        cache: "no-store",
        credentials: "include",
        headers: { Accept: "application/json", ...authHeaders() },
      });
      const result = await readJson<FinanceSummaryResponse>(response);
      if (!response.ok || !result?.success) {
        setError(result?.message || "دریافت اطلاعات کیف پول انجام نشد.");
        return;
      }
      setSummary(result);
    } catch {
      setError("ارتباط با سرویس کیف پول برقرار نشد.");
    } finally {
      setLoading(false);
    }
  }

  async function loadTransferInfo() {
    setTransferLoading(true);
    try {
      const response = await fetch("/api/finance/wallet/transfer", {
        cache: "no-store",
        credentials: "include",
        headers: { Accept: "application/json", ...authHeaders() },
      });
      const result = await readJson<TransferInfoResponse>(response);
      if (!response.ok || !result?.success) {
        setTransferInfo(null);
        return;
      }
      setTransferInfo(result);
      const targets = result.targets || [];
      setDestinationScope((current) => (
        targets.some((target) => target.scope === current)
          ? current
          : targets[0]?.scope || ""
      ));
      setCreditDestinationScope((current) => (
        targets.some((target) => target.scope === current)
          ? current
          : targets[0]?.scope || ""
      ));
    } catch {
      setTransferInfo(null);
    } finally {
      setTransferLoading(false);
    }
  }

  useEffect(() => {
    void loadWallet();
    void loadTransferInfo();
    if (new URLSearchParams(window.location.search).get("transfer") === "1") {
      setTransferOpen(true);
    }
  }, []);

  async function submitTransfer() {
    const source = transferInfo?.source;
    const target = (transferInfo?.targets || []).find((item) => item.scope === destinationScope);
    const amountToman = Number(normalizeDigits(amount));

    setTransferError("");
    setTransferNotice("");

    if (!source || !target) {
      setTransferError("کیف پول مقصد را انتخاب کنید.");
      return;
    }
    if (!Number.isSafeInteger(amountToman) || amountToman <= 0) {
      setTransferError("مبلغ انتقال را صحیح وارد کنید.");
      return;
    }
    if (amountToman > Number(summary?.wallet?.available_balance_toman || 0)) {
      setTransferError("مبلغ انتقال از موجودی قابل استفاده بیشتر است.");
      return;
    }

    setTransferWorking(true);
    try {
      const response = await fetch("/api/finance/wallet/transfer", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          source_scope: source.scope,
          destination_scope: target.scope,
          amount_toman: amountToman,
          idempotency_key: `transfer_${crypto.randomUUID().replace(/-/g, "")}`,
        }),
      });
      const result = await readJson<TransferResponse>(response);
      if (!response.ok || !result?.success) {
        setTransferError(result?.message || "انتقال موجودی انجام نشد.");
        return;
      }

      setTransferNotice(result.message || "انتقال موجودی انجام شد.");
      setAmount("");
      await Promise.all([loadWallet(), loadTransferInfo()]);
    } catch {
      setTransferError("ارتباط با سرویس انتقال برقرار نشد.");
    } finally {
      setTransferWorking(false);
    }
  }

  const storyCreditBalance = Number(
    summary?.credit_balances?.find((item) => item.asset_code === "story_credit")?.available_quantity || 0,
  );

  async function submitCreditTransfer() {
    const source = transferInfo?.source;
    const target = (transferInfo?.targets || []).find((item) => item.scope === creditDestinationScope);
    const quantity = Number(normalizeDigits(creditQuantity));

    setCreditTransferError("");
    setCreditTransferNotice("");

    if (!source || !target) {
      setCreditTransferError("حساب مقصد را انتخاب کنید.");
      return;
    }
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      setCreditTransferError("تعداد اعتبار را صحیح وارد کنید.");
      return;
    }
    if (quantity > storyCreditBalance) {
      setCreditTransferError("تعداد اعتبار از موجودی اعتبار استوری بیشتر است.");
      return;
    }

    setCreditTransferWorking(true);
    try {
      const response = await fetch("/api/finance/credits/transfer", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          source_scope: source.scope,
          destination_scope: target.scope,
          asset_code: "story_credit",
          quantity: quantity,
          idempotency_key: `credit_transfer_${crypto.randomUUID().replace(/-/g, "")}`,
        }),
      });
      const result = await readJson<CreditTransferResponse>(response);
      if (!response.ok || !result?.success) {
        setCreditTransferError(result?.message || "انتقال اعتبار انجام نشد.");
        return;
      }

      setCreditTransferNotice(result.message || "انتقال اعتبار انجام شد.");
      setCreditQuantity("");
      await Promise.all([loadWallet(), loadTransferInfo()]);
    } catch {
      setCreditTransferError("ارتباط با سرویس انتقال اعتبار برقرار نشد.");
    } finally {
      setCreditTransferWorking(false);
    }
  }

  const wallet = summary?.wallet;
  const transactions = summary?.transactions || [];
  const creditTransactions = summary?.credit_transactions || [];
  const transferTargets = transferInfo?.targets || [];
  const canTransfer = Boolean(transferInfo?.source && transferTargets.length);

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/account" className={styles.back} aria-label="بازگشت به حساب">
            <span aria-hidden="true">←</span>
            <strong>حساب</strong>
          </Link>
          <h1>کیف پول</h1>
          <Link href="/" className={styles.logo} aria-label="چاکود">
            <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
          </Link>
        </header>

        {loading ? (
          <section className={styles.stateCard}>
            <span className={styles.loader} aria-hidden="true" />
            <strong>در حال دریافت کیف پول…</strong>
          </section>
        ) : error ? (
          <section className={styles.stateCard}>
            <strong>اطلاعات کیف پول در دسترس نیست</strong>
            <p>{error}</p>
          </section>
        ) : (
          <>
            <section className={styles.balanceCard} aria-label="موجودی کیف پول">
              <div className={styles.walletIdentity}>
                <span className={styles.balanceLabel}>موجودی قابل استفاده</span>
                {transferInfo?.source ? <b>{transferInfo.source.name}</b> : null}
              </div>
              <strong className={styles.balance}>{formatToman(wallet?.available_balance_toman || 0)}</strong>

              <div className={styles.balanceMeta}>
                <span>
                  <small>مسدودشده</small>
                  <b>{formatToman(wallet?.blocked_balance_toman || 0)}</b>
                </span>
                <span>
                  <small>وضعیت</small>
                  <b>{statusTitles[wallet?.status || ""] || wallet?.status || "نامشخص"}</b>
                </span>
              </div>

              <div className={styles.balanceActions}>
                <Link className={styles.chargeButton} href="/account/payments/checkout?type=wallet_charge">
                  <span aria-hidden="true">＋</span>
                  افزایش موجودی
                </Link>
                {canTransfer ? (
                  <button
                    type="button"
                    className={styles.transferButton}
                    onClick={() => {
                      setTransferOpen((value) => !value);
                      setTransferError("");
                      setTransferNotice("");
                    }}
                  >
                    <span aria-hidden="true">⇄</span>
                    انتقال بین کیف پول‌ها
                  </button>
                ) : null}
              </div>
            </section>

            <section className={styles.creditCard} aria-label="اعتبار استوری">
              <div className={styles.creditHead}>
                <div>
                  <span>دارایی غیرنقدی</span>
                  <h2>اعتبار استوری</h2>
                </div>
                <strong>
                  {formatQuantity(storyCreditBalance)}
                  <small>اعتبار</small>
                </strong>
              </div>
              <p>اعتبارهای خریداری‌شده تاریخ انقضا ندارند و مستقل از موجودی تومانی نگهداری می‌شوند.</p>
              {canTransfer ? (
                <button
                  type="button"
                  className={styles.creditTransferButton}
                  onClick={() => {
                    setCreditTransferOpen((value) => !value);
                    setCreditTransferError("");
                    setCreditTransferNotice("");
                  }}
                >
                  <span aria-hidden="true">⇄</span>
                  انتقال اعتبار
                </button>
              ) : null}
            </section>

            {creditTransferOpen ? (
              <section className={styles.transferPanel} aria-label="انتقال اعتبار استوری بین حساب‌های من">
                <div className={styles.transferHead}>
                  <div>
                    <span>اعتبار استوری</span>
                    <h2>انتقال اعتبار بین حساب‌های من</h2>
                  </div>
                  <button type="button" onClick={() => setCreditTransferOpen(false)} aria-label="بستن">×</button>
                </div>

                {transferLoading ? (
                  <div className={styles.transferState}>در حال بررسی حساب‌های مجاز…</div>
                ) : !canTransfer ? (
                  <div className={styles.transferState}>حساب دیگری با مالکیت تأییدشده پیدا نشد.</div>
                ) : (
                  <>
                    <div className={styles.transferRoute}>
                      <div>
                        <small>مبدأ</small>
                        <strong>{transferInfo?.source?.name}</strong>
                        <em>موجودی فعلی: {formatQuantity(storyCreditBalance)} اعتبار</em>
                      </div>
                      <span aria-hidden="true">←</span>
                      <label>
                        <small>مقصد</small>
                        <select
                          value={creditDestinationScope}
                          onChange={(event) => setCreditDestinationScope(event.target.value)}
                        >
                          {transferTargets.map((target) => (
                            <option key={target.scope} value={target.scope}>{target.name}</option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <label className={styles.amountField}>
                      <span>تعداد اعتبار</span>
                      <div>
                        <input
                          value={creditQuantity}
                          onChange={(event) => setCreditQuantity(event.target.value)}
                          inputMode="numeric"
                          autoComplete="off"
                          placeholder="مثلاً ۵"
                        />
                        <b>اعتبار</b>
                      </div>
                    </label>

                    <div className={styles.transferRules}>
                      <span>فقط اعتبار استوری منتقل می‌شود؛ موجودی تومانی تغییر نمی‌کند.</span>
                      <span>مقصد فقط حساب شخصی یا فعالیت تأییدشده متعلق به همین کاربر است.</span>
                      <span>انتقال اعتبار تاریخ انقضا ایجاد نمی‌کند.</span>
                    </div>

                    {creditTransferError ? <div className={styles.transferError}>{creditTransferError}</div> : null}
                    {creditTransferNotice ? <div className={styles.transferNotice}>{creditTransferNotice}</div> : null}

                    <button
                      type="button"
                      className={styles.confirmTransfer}
                      onClick={() => void submitCreditTransfer()}
                      disabled={creditTransferWorking}
                    >
                      {creditTransferWorking ? "در حال انتقال…" : "تأیید انتقال اعتبار"}
                    </button>
                  </>
                )}
              </section>
            ) : null}

            {creditTransactions.length ? (
              <section className={styles.transactionsSection} aria-label="گردش اعتبار استوری">
                <div className={styles.sectionHead}>
                  <div>
                    <span>گردش اعتبار</span>
                    <h2>تراکنش‌های اعتبار استوری</h2>
                  </div>
                  <small>{formatQuantity(creditTransactions.length)} مورد</small>
                </div>
                <div className={styles.transactionList}>
                  {creditTransactions.slice(0, 12).map((item) => {
                    const incoming = item.quantity_delta > 0;
                    return (
                      <article className={styles.transaction} key={`credit-${item.id}`}>
                        <span className={styles.transactionIcon} data-direction={incoming ? "credit" : "debit"}>
                          {incoming ? "+" : "−"}
                        </span>
                        <div className={styles.transactionCopy}>
                          <strong>{creditTransactionTitles[item.transaction_type] || "تراکنش اعتبار استوری"}</strong>
                          <small>{formatDate(item.created_at)}</small>
                        </div>
                        <div className={styles.transactionAmount} data-direction={incoming ? "credit" : "debit"}>
                          <strong>{incoming ? "+" : "−"}{formatQuantity(Math.abs(item.quantity_delta))} اعتبار</strong>
                          <small>story_credit</small>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {transferOpen ? (
              <section className={styles.transferPanel} aria-label="انتقال بین کیف پول‌های من">
                <div className={styles.transferHead}>
                  <div>
                    <span>انتقال امن داخلی</span>
                    <h2>انتقال بین کیف پول‌های من</h2>
                  </div>
                  <button type="button" onClick={() => setTransferOpen(false)} aria-label="بستن">×</button>
                </div>

                {transferLoading ? (
                  <div className={styles.transferState}>در حال بررسی حساب‌های مجاز…</div>
                ) : !canTransfer ? (
                  <div className={styles.transferState}>برای این حساب، کیف پول دیگری با مالکیت تأییدشده پیدا نشد.</div>
                ) : (
                  <>
                    <div className={styles.transferRoute}>
                      <div>
                        <small>مبدأ</small>
                        <strong>{transferInfo?.source?.name}</strong>
                        <em>از حساب فعال به‌صورت خودکار</em>
                      </div>
                      <span aria-hidden="true">←</span>
                      <label>
                        <small>مقصد</small>
                        <select value={destinationScope} onChange={(event) => setDestinationScope(event.target.value)}>
                          {transferTargets.map((target) => (
                            <option key={target.scope} value={target.scope}>{target.name}</option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <label className={styles.amountField}>
                      <span>مبلغ انتقال</span>
                      <div>
                        <input
                          value={amount}
                          onChange={(event) => setAmount(event.target.value)}
                          inputMode="numeric"
                          autoComplete="off"
                          placeholder="مثلاً ۵۰۰٬۰۰۰"
                        />
                        <b>تومان</b>
                      </div>
                    </label>

                    <div className={styles.transferRules}>
                      <span>فقط موجودی قابل استفاده منتقل می‌شود.</span>
                      <span>مقصد فقط حساب شخصی یا کسب‌وکاری است که مالکیتش برای همین کاربر تأیید شده.</span>
                      <span>حساب پرسنلی/عضوی و موجودی مسدودشده وارد انتقال نمی‌شوند.</span>
                    </div>

                    {transferError ? <div className={styles.transferError}>{transferError}</div> : null}
                    {transferNotice ? <div className={styles.transferNotice}>{transferNotice}</div> : null}

                    <button
                      type="button"
                      className={styles.confirmTransfer}
                      onClick={() => void submitTransfer()}
                      disabled={transferWorking}
                    >
                      {transferWorking ? "در حال انتقال…" : "تأیید و انتقال"}
                    </button>
                  </>
                )}
              </section>
            ) : null}

            <section className={styles.transactionsSection}>
              <div className={styles.sectionHead}>
                <div>
                  <span>گردش کیف پول تومانی</span>
                  <h2>تراکنش‌های تومانی</h2>
                </div>
                <small>{new Intl.NumberFormat("fa-IR").format(transactions.length)} مورد</small>
              </div>

              {transactions.length ? (
                <div className={styles.transactionList}>
                  {transactions.slice(0, 12).map((item) => {
                    const credit = item.direction === "credit";
                    return (
                      <article className={styles.transaction} key={item.id}>
                        <span className={styles.transactionIcon} data-direction={credit ? "credit" : "debit"}>
                          {credit ? "+" : "−"}
                        </span>
                        <div className={styles.transactionCopy}>
                          <strong>{item.description || item.transactionType || "تراکنش کیف پول"}</strong>
                          <small>{formatDate(item.createdAt)}</small>
                        </div>
                        <div className={styles.transactionAmount} data-direction={credit ? "credit" : "debit"}>
                          <strong>{credit ? "+" : "−"}{formatToman(item.amountToman)}</strong>
                          <small>{statusTitles[item.status] || item.status || ""}</small>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.empty}>
                  <span aria-hidden="true">◌</span>
                  <strong>هنوز تراکنش تومانی ثبت نشده</strong>
                  <p>بعد از اولین افزایش موجودی، انتقال یا خرید با کیف پول، تراکنش‌های تومانی اینجا نمایش داده می‌شوند.</p>
                </div>
              )}
            </section>
          </>
        )}
      </div>
      <MobileBottomNav />
    </main>
  );
}
