"use client";

import Link from "next/link";
import QRCode from "qrcode";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";

import MobileBottomNav from "../../components/MobileBottomNav";
import {
  ACTIVE_ACCOUNT_EVENT,
  readActiveAccount,
  type ActiveAccountSelection,
} from "../../lib/active-account";
import {
  buildDailyCard,
  formatPersianCardDate,
  getIdentityInitials,
} from "../../lib/daily-card-expanded";
import styles from "./page.module.css";

type ImageValue = string | { url?: string | null; image_url?: string | null } | null;

type User = {
  id?: string | number;
  mobile?: string;
  full_name?: string | null;
  display_name?: string | null;
  business_name?: string | null;
  avatar_url?: string | null;
  profile_image_url?: string | null;
  logo_url?: string | null;
  photo_url?: string | null;
  avatar?: ImageValue;
  profile_image?: ImageValue;
};

type MeResponse = {
  success?: boolean;
  user?: User | null;
  message?: string;
};

type AccountActivity = {
  id: number;
  type: string;
  name: string;
  external_dealer_id?: number | null;
  logo_url?: string | null;
};

type AccountMembership = {
  type: string;
  name: string;
  external_dealer_id?: number | null;
  role?: string;
  logo_url?: string | null;
};

type ActivitiesResponse = {
  success?: boolean;
  activities?: AccountActivity[];
  memberships?: AccountMembership[];
};

type PublicBusinessSummary = {
  id: number;
  slug: string;
  business_type: string;
  name: string;
};

type BusinessesResponse = {
  success?: boolean;
  items?: PublicBusinessSummary[];
};

type CardCssVariables = CSSProperties & Record<`--${string}`, string>;

type ResolvedCardIdentity = {
  key: string;
  name: string;
  label: string;
  logo: string;
  type: string;
  externalDealerId: number | null;
};

type ShareState = "idle" | "shared" | "copied" | "error";

type CardRecipe = ReturnType<typeof buildDailyCard>;
type DateLabel = ReturnType<typeof formatPersianCardDate>;
type SplitQuote = ReturnType<typeof splitQuote>;

const PUBLIC_SITE_URL = "https://chakod.com";
const BUSINESS_TYPES = new Set(["dealer", "parts_store", "repair_shop", "car_service"]);

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("chakod_session_token") || "";
  return token ? { Authorization: `Bearer ${token}`, "X-Session-Token": token } : {};
}

function readCachedUser() {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem("chakod_user");
    return cached ? (JSON.parse(cached) as User) : null;
  } catch {
    return null;
  }
}

function displayName(user: User | null) {
  return user?.display_name?.trim()
    || user?.full_name?.trim()
    || user?.business_name?.trim()
    || "حساب چاکود";
}

function imageFromValue(value?: ImageValue) {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  return value.url?.trim() || value.image_url?.trim() || "";
}

function identityImage(user: User | null) {
  if (!user) return "";
  return user.avatar_url?.trim()
    || user.profile_image_url?.trim()
    || user.logo_url?.trim()
    || user.photo_url?.trim()
    || imageFromValue(user.avatar)
    || imageFromValue(user.profile_image);
}

function accountLabel(type: string) {
  if (type === "dealer") return "نمایشگاه خودرو";
  if (type === "parts_store") return "فروشگاه قطعات";
  if (type === "repair_shop") return "تعمیرگاه خودرو";
  if (type === "car_service") return "مرکز خدمات خودرو";
  return "کسب‌وکار";
}

function resolveCardIdentity(
  selection: ActiveAccountSelection,
  user: User | null,
  activities: AccountActivity[],
  memberships: AccountMembership[],
): ResolvedCardIdentity {
  const personalName = displayName(user);
  const personalLogo = identityImage(user);
  const userKey = String(user?.id || user?.mobile || personalName);

  if (selection.kind === "activity") {
    const current = activities.find((item) => item.id === selection.id);
    const name = current?.name?.trim() || selection.name.trim() || personalName;
    const type = current?.type || selection.type;
    const externalDealerId = Math.round(Number(current?.external_dealer_id || 0)) || null;
    return {
      key: `${userKey}|activity:${selection.id}:${type}`,
      name,
      label: accountLabel(type),
      logo: current?.logo_url?.trim() || selection.logo_url?.trim() || personalLogo,
      type,
      externalDealerId,
    };
  }

  if (selection.kind === "membership") {
    const current = memberships.find((item) => Number(item.external_dealer_id || 0) === selection.external_dealer_id);
    const name = current?.name?.trim() || selection.name.trim() || personalName;
    const type = current?.type || selection.type;
    return {
      key: `${userKey}|membership:${selection.external_dealer_id}:${type}`,
      name,
      label: accountLabel(type),
      logo: current?.logo_url?.trim() || selection.logo_url?.trim() || personalLogo,
      type,
      externalDealerId: Math.round(Number(selection.external_dealer_id || 0)) || null,
    };
  }

  return {
    key: `${userKey}|personal`,
    name: personalName,
    label: "حساب شخصی",
    logo: personalLogo,
    type: "personal",
    externalDealerId: null,
  };
}

function splitQuote(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  const [lead, ...rest] = normalized.split("؛");
  const tail = rest.join("؛").trim().replace(/[.。]+$/, "");
  return {
    lead: lead.trim(),
    tail,
  };
}

function normalizeBusinessName(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("fa")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ۀة]/g, "ه")
    .replace(/[ؤ]/g, "و")
    .replace(/[إأ]/g, "ا")
    .replace(/[\u200c\u200f\u202a-\u202e\s\-_/\\،,.]+/g, "");
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function cardGradient(
  context: CanvasRenderingContext2D,
  background: string,
  width: number,
  height: number,
) {
  const match = background.match(/linear-gradient\(\s*([-\d.]+)deg\s*,([\s\S]+)\)$/i);
  if (!match) return background;

  const angle = Number(match[1]) * (Math.PI / 180);
  const dx = Math.sin(angle);
  const dy = -Math.cos(angle);
  const distance = Math.abs(dx) * width / 2 + Math.abs(dy) * height / 2;
  const centerX = width / 2;
  const centerY = height / 2;
  const gradient = context.createLinearGradient(
    centerX - dx * distance,
    centerY - dy * distance,
    centerX + dx * distance,
    centerY + dy * distance,
  );
  const stops = Array.from(
    match[2].matchAll(/(#[0-9a-f]{3,8}|rgba?\([^)]*\))\s+(-?\d+(?:\.\d+)?)%/gi),
  );
  if (!stops.length) return background;
  stops.forEach((stop) => {
    gradient.addColorStop(Math.max(0, Math.min(1, Number(stop[2]) / 100)), stop[1]);
  });
  return gradient;
}

function wrapText(context: CanvasRenderingContext2D, value: string, maxWidth: number) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });
  if (line) lines.push(line);
  return lines;
}

function fitText(
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
  maxLines: number,
  startSize: number,
  minSize: number,
  weight: number,
) {
  let fontSize = startSize;
  let lines: string[] = [];
  while (fontSize >= minSize) {
    context.font = `${weight} ${fontSize}px Arial, sans-serif`;
    lines = wrapText(context, value, maxWidth);
    if (lines.length <= maxLines) break;
    fontSize -= 4;
  }
  return { fontSize, lines: lines.slice(0, maxLines) };
}

function loadCanvasImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const image = new Image();
    if (/^https?:\/\//i.test(src) && !src.startsWith(window.location.origin)) {
      image.crossOrigin = "anonymous";
    }
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function drawCoverImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = Math.max(0, (image.naturalWidth - sourceWidth) / 2);
  const sourceY = Math.max(0, (image.naturalHeight - sourceHeight) / 2);
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

function drawMotif(context: CanvasRenderingContext2D, recipe: CardRecipe) {
  context.save();
  context.globalAlpha = 0.42;
  context.strokeStyle = recipe.style.line;
  context.fillStyle = "rgba(255,255,255,.045)";
  context.lineWidth = 3;

  if (recipe.motif === 0) {
    [0, 88, 166].forEach((extra) => {
      context.beginPath();
      context.arc(-20, 790, 290 + extra, 0, Math.PI * 2);
      context.stroke();
    });
  } else if (recipe.motif === 1) {
    context.translate(540, 980);
    context.rotate((-17 + recipe.rotation) * Math.PI / 180);
    [-130, 0, 130].forEach((offset, index) => {
      context.setLineDash(index === 1 ? [24, 28] : []);
      context.beginPath();
      context.moveTo(-760, offset);
      context.lineTo(760, offset);
      context.stroke();
    });
  } else if (recipe.motif === 2) {
    const beam = context.createLinearGradient(180, 0, 760, 0);
    beam.addColorStop(0, "rgba(255,255,255,0)");
    beam.addColorStop(0.5, "rgba(255,255,255,.10)");
    beam.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = beam;
    context.save();
    context.translate(430, 960);
    context.rotate(recipe.rotation * Math.PI / 180);
    context.fillRect(-240, -1200, 480, 2400);
    context.restore();
  } else {
    context.save();
    context.translate(95, 810);
    context.rotate((-8 + recipe.rotation) * Math.PI / 180);
    roundedRect(context, -170, 0, 420, 560, 70);
    context.stroke();
    roundedRect(context, -90, 85, 420, 560, 70);
    context.stroke();
    context.restore();
  }

  context.setLineDash([]);
  context.restore();
}

async function createShareCardBlob({
  recipe,
  quote,
  dateLabel,
  identity,
  initials,
  publicUrl,
}: {
  recipe: CardRecipe;
  quote: SplitQuote;
  dateLabel: DateLabel;
  identity: ResolvedCardIdentity;
  initials: string;
  publicUrl: string;
}) {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready.catch(() => undefined);
  }

  const width = 1080;
  const height = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas-unavailable");

  context.fillStyle = cardGradient(context, recipe.style.background, width, height);
  context.fillRect(0, 0, width, height);

  const glow = context.createRadialGradient(
    width * recipe.glowX / 100,
    height * recipe.glowY / 100,
    0,
    width * recipe.glowX / 100,
    height * recipe.glowY / 100,
    440,
  );
  glow.addColorStop(0, "rgba(255,255,255,.16)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);
  drawMotif(context, recipe);

  context.direction = "rtl";
  context.textBaseline = "alphabetic";

  context.textAlign = "right";
  context.fillStyle = recipe.style.muted;
  context.font = "800 25px Arial, sans-serif";
  context.fillText("کارت روز کسب‌وکار", 940, 145);
  context.fillStyle = recipe.style.foreground;
  context.font = "900 36px Arial, sans-serif";
  context.fillText(identity.label, 940, 196);

  roundedRect(context, 72, 84, 330, 166, 42);
  context.fillStyle = "rgba(255,255,255,.10)";
  context.fill();
  context.strokeStyle = recipe.style.line;
  context.lineWidth = 2;
  context.stroke();
  context.textAlign = "right";
  context.fillStyle = recipe.style.accent;
  context.font = "900 36px Arial, sans-serif";
  context.fillText(dateLabel.weekday, 365, 148);
  context.fillStyle = recipe.style.foreground;
  context.font = "800 29px Arial, sans-serif";
  context.fillText(dateLabel.date, 365, 202);

  context.textAlign = "center";
  context.fillStyle = recipe.style.accent;
  context.globalAlpha = 0.82;
  context.font = "900 178px Georgia, serif";
  context.fillText("“", width / 2, 570);
  context.globalAlpha = 1;

  const lead = fitText(context, quote.lead, 860, 3, 78, 58, 900);
  context.fillStyle = recipe.style.foreground;
  context.font = `900 ${lead.fontSize}px Arial, sans-serif`;
  let cursorY = 700;
  const leadLineHeight = lead.fontSize * 1.62;
  lead.lines.forEach((line) => {
    context.fillText(line, width / 2, cursorY);
    cursorY += leadLineHeight;
  });

  if (quote.tail) {
    cursorY += 30;
    const tail = fitText(context, quote.tail, 820, 3, 54, 42, 800);
    context.globalAlpha = 0.88;
    context.font = `800 ${tail.fontSize}px Arial, sans-serif`;
    const tailLineHeight = tail.fontSize * 1.68;
    tail.lines.forEach((line) => {
      context.fillText(line, width / 2, cursorY);
      cursorY += tailLineHeight;
    });
    context.globalAlpha = 1;
  }

  cursorY += 38;
  roundedRect(context, width / 2 - 78, cursorY, 156, 8, 4);
  context.fillStyle = recipe.style.accent;
  context.fill();

  // Keep the lower story controls/caption area clear on Instagram, WhatsApp and similar apps.
  const footerTop = 1460;
  context.strokeStyle = recipe.style.line;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(70, footerTop);
  context.lineTo(1010, footerTop);
  context.stroke();

  const qrDataUrl = await QRCode.toDataURL(publicUrl, {
    width: 260,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#28143f", light: "#ffffff" },
  });
  const [businessLogo, chakodLogo, qrImage] = await Promise.all([
    loadCanvasImage(identity.logo),
    loadCanvasImage("/brand/chakod-logo-horizontal.png"),
    loadCanvasImage(qrDataUrl),
  ]);

  const avatarX = 844;
  const avatarY = 1510;
  const avatarSize = 124;
  context.save();
  roundedRect(context, avatarX, avatarY, avatarSize, avatarSize, 32);
  context.clip();
  context.fillStyle = "rgba(255,255,255,.14)";
  context.fillRect(avatarX, avatarY, avatarSize, avatarSize);
  if (businessLogo) {
    drawCoverImage(context, businessLogo, avatarX, avatarY, avatarSize, avatarSize);
  } else {
    context.fillStyle = recipe.style.foreground;
    context.textAlign = "center";
    context.font = "900 42px Arial, sans-serif";
    context.fillText(initials, avatarX + avatarSize / 2, avatarY + 77);
  }
  context.restore();
  context.strokeStyle = recipe.style.line;
  roundedRect(context, avatarX, avatarY, avatarSize, avatarSize, 32);
  context.stroke();

  context.textAlign = "right";
  context.fillStyle = recipe.style.foreground;
  context.font = "900 42px Arial, sans-serif";
  const businessName = identity.name.length > 28 ? `${identity.name.slice(0, 27)}…` : identity.name;
  context.fillText(businessName, 812, 1558);
  context.fillStyle = recipe.style.muted;
  context.font = "800 25px Arial, sans-serif";
  context.fillText(`${identity.label} عضو چاکود`, 812, 1607);
  context.fillStyle = recipe.style.accent;
  context.font = "800 24px Arial, sans-serif";
  context.fillText("ویترین، خودروها و راه‌های ارتباطی در چاکود", 812, 1652);

  if (qrImage) {
    roundedRect(context, 65, 1495, 168, 168, 30);
    context.fillStyle = "rgba(255,255,255,.96)";
    context.fill();
    context.drawImage(qrImage, 78, 1508, 142, 142);
    context.textAlign = "center";
    context.fillStyle = recipe.style.foreground;
    context.font = "800 22px Arial, sans-serif";
    context.fillText("مشاهده ویترین", 149, 1698);
  }

  if (chakodLogo) {
    context.save();
    context.globalAlpha = 0.12;
    context.filter = "grayscale(1)";
    const markWidth = 160;
    const markHeight = markWidth * (chakodLogo.naturalHeight / chakodLogo.naturalWidth);
    context.drawImage(chakodLogo, 350, 1540, markWidth, markHeight);
    context.filter = "none";
    context.restore();
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("png-export-failed"));
    }, "image/png");
  });
}

function shareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="18" cy="5" r="2.4" />
      <circle cx="6" cy="12" r="2.4" />
      <circle cx="18" cy="19" r="2.4" />
      <path d="m8.2 10.8 7.5-4.3M8.2 13.2l7.5 4.3" />
    </svg>
  );
}

export default function DailyCardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [activeAccount, setActiveAccount] = useState<ActiveAccountSelection>({ kind: "personal" });
  const [activities, setActivities] = useState<AccountActivity[]>([]);
  const [memberships, setMemberships] = useState<AccountMembership[]>([]);
  const [publicBusiness, setPublicBusiness] = useState<PublicBusinessSummary | null>(null);
  const [businessLookupComplete, setBusinessLookupComplete] = useState(false);
  const [shareFile, setShareFile] = useState<File | null>(null);
  const [shareState, setShareState] = useState<ShareState>("idle");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    const syncActiveAccount = () => setActiveAccount(readActiveAccount());
    syncActiveAccount();
    window.addEventListener(ACTIVE_ACCOUNT_EVENT, syncActiveAccount);
    window.addEventListener("storage", syncActiveAccount);
    return () => {
      window.removeEventListener(ACTIVE_ACCOUNT_EVENT, syncActiveAccount);
      window.removeEventListener("storage", syncActiveAccount);
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    const cached = readCachedUser();
    if (cached) setUser(cached);

    void Promise.allSettled([
      fetch("/api/auth/me", {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json", ...authHeaders() },
      }).then(async (response) => {
        const result = (await response.json().catch(() => null)) as MeResponse | null;
        if (ignore) return;
        if (response.ok && result?.success && result.user) {
          setUser(result.user);
          localStorage.setItem("chakod_user", JSON.stringify(result.user));
          setError("");
          return;
        }
        if (!cached) setError(result?.message || "برای دیدن کارت روز، وارد حساب چاکود شو.");
      }),
      fetch("/api/auth/account-activities", {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json", ...authHeaders() },
      }).then(async (response) => {
        const result = (await response.json().catch(() => null)) as ActivitiesResponse | null;
        if (ignore || !response.ok || !result?.success) return;
        setActivities(Array.isArray(result.activities) ? result.activities : []);
        setMemberships(Array.isArray(result.memberships) ? result.memberships : []);
      }),
    ]).finally(() => {
      if (!ignore) setLoading(false);
    });

    return () => { ignore = true; };
  }, []);

  const identity = useMemo(
    () => resolveCardIdentity(activeAccount, user, activities, memberships),
    [activeAccount, user, activities, memberships],
  );
  const recipe = useMemo(() => buildDailyCard(identity.key, today), [identity.key, today]);
  const quote = useMemo(() => splitQuote(recipe.quote), [recipe.quote]);
  const dateLabel = useMemo(() => formatPersianCardDate(today), [today]);
  const initials = getIdentityInitials(identity.name);

  useEffect(() => {
    const controller = new AbortController();
    setPublicBusiness(null);
    setBusinessLookupComplete(false);

    if (!user || !BUSINESS_TYPES.has(identity.type)) {
      setBusinessLookupComplete(true);
      return () => controller.abort();
    }

    const params = new URLSearchParams({ limit: "12", q: identity.name });
    params.set("type", identity.type);
    fetch(`/api/businesses?${params.toString()}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = (await response.json().catch(() => null)) as BusinessesResponse | null;
        if (!response.ok || !result?.success) return;
        const items = Array.isArray(result.items) ? result.items : [];
        const normalizedName = normalizeBusinessName(identity.name);
        const exactById = identity.externalDealerId
          ? items.find((item) => Number(item.id) === identity.externalDealerId)
          : null;
        const exactByName = items.find(
          (item) => item.business_type === identity.type && normalizeBusinessName(item.name) === normalizedName,
        );
        setPublicBusiness(exactById || exactByName || null);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setBusinessLookupComplete(true);
      });

    return () => controller.abort();
  }, [identity.externalDealerId, identity.name, identity.type, user]);

  const publicPath = useMemo(() => {
    if (publicBusiness?.slug) {
      return `/businesses/${encodeURIComponent(publicBusiness.slug)}?ref=daily-card`;
    }
    const params = new URLSearchParams({ ref: "daily-card" });
    if (BUSINESS_TYPES.has(identity.type)) params.set("type", identity.type);
    if (identity.name.trim()) params.set("q", identity.name.trim());
    return `/businesses?${params.toString()}`;
  }, [identity.name, identity.type, publicBusiness]);

  const publicUrl = useMemo(() => `${PUBLIC_SITE_URL}${publicPath}`, [publicPath]);

  useEffect(() => {
    let ignore = false;
    setShareFile(null);
    if (!user || !businessLookupComplete) return () => { ignore = true; };

    void createShareCardBlob({ recipe, quote, dateLabel, identity, initials, publicUrl })
      .then((blob) => {
        if (ignore) return;
        const safeName = normalizeBusinessName(identity.name).slice(0, 36) || "chakod";
        setShareFile(new File([blob], `chakod-daily-${safeName}.png`, { type: "image/png" }));
      })
      .catch(() => {
        if (!ignore) setShareFile(null);
      });

    return () => { ignore = true; };
  }, [businessLookupComplete, dateLabel, identity, initials, publicUrl, quote, recipe, user]);

  const cardStyle: CardCssVariables = {
    "--card-background": recipe.style.background,
    "--card-foreground": recipe.style.foreground,
    "--card-accent": recipe.style.accent,
    "--card-muted": recipe.style.muted,
    "--card-line": recipe.style.line,
    "--brand-surface": recipe.style.brandSurface,
    "--glow-x": `${recipe.glowX}%`,
    "--glow-y": `${recipe.glowY}%`,
    "--motif-rotation": `${recipe.rotation}deg`,
  };

  const motifClass = [
    styles.motifOrbit,
    styles.motifRoad,
    styles.motifBeam,
    styles.motifBlocks,
  ][recipe.motif];

  const shareText = `کارت روز ${identity.name} در چاکود\nویترین، خودروها و راه‌های ارتباطی مجموعه را اینجا ببینید:\n${publicUrl}`;

  async function shareDailyCard() {
    setShareState("idle");
    try {
      const canShareFile = Boolean(
        shareFile
        && typeof navigator.share === "function"
        && (typeof navigator.canShare !== "function" || navigator.canShare({ files: [shareFile] })),
      );

      if (canShareFile && shareFile) {
        await navigator.share({
          title: `کارت روز ${identity.name} | چاکود`,
          text: shareText,
          url: publicUrl,
          files: [shareFile],
        });
        setShareState("shared");
        return;
      }

      if (typeof navigator.share === "function") {
        await navigator.share({
          title: `کارت روز ${identity.name} | چاکود`,
          text: shareText,
          url: publicUrl,
        });
        setShareState("shared");
        return;
      }

      await navigator.clipboard.writeText(publicUrl);
      setShareState("copied");
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setShareState("error");
    }
  }

  function downloadDailyCard() {
    if (!shareFile) return;
    const url = URL.createObjectURL(shareFile);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = shareFile.name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function copyShowroomLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setShareState("copied");
      window.setTimeout(() => setShareState("idle"), 1800);
    } catch {
      window.prompt("لینک ویترین را کپی کنید:", publicUrl);
    }
  }

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <span>کارت روز</span>
            <strong>امروزِ تو، آماده‌ی دیده‌شدن</strong>
          </div>
          <Link href="/" aria-label="صفحه اصلی چاکود" className={styles.homeLink}>چاکود</Link>
        </header>

        {loading && !user ? <div className={styles.state}>در حال ساخت کارت امروزت…</div> : null}

        {!loading && !user ? (
          <section className={styles.emptyState}>
            <strong>کارت روز برای حساب تو ساخته می‌شود.</strong>
            <p>{error || "برای دریافت کارت امروز وارد حساب چاکود شو."}</p>
            <Link href="/login">ورود به حساب</Link>
          </section>
        ) : null}

        {user ? (
          <>
            <article className={`${styles.card} ${motifClass}`} style={cardStyle} aria-label={`کارت روز ${identity.name}`}>
              <div className={styles.ambient} aria-hidden="true" />
              <div className={styles.motif} aria-hidden="true" />

              <div className={styles.identityRow}>
                <div className={styles.accountType}>
                  <span>کارت روز کسب‌وکار</span>
                  <strong>{identity.label}</strong>
                </div>
                <div className={styles.datePill} aria-label={`${dateLabel.weekday} ${dateLabel.date}`}>
                  <strong>{dateLabel.weekday}</strong>
                  <span>{dateLabel.date}</span>
                </div>
              </div>

              <div className={styles.quoteArea}>
                <span className={styles.quoteMark} aria-hidden="true">“</span>
                <p aria-label={recipe.quote}>
                  <span className={styles.quoteLead}>{quote.lead}</span>
                  {quote.tail ? <span className={styles.quoteTail}>{quote.tail}</span> : null}
                </p>
                <div className={styles.quoteRule} aria-hidden="true" />
              </div>

              <div className={styles.footer}>
                <div className={styles.businessSignature}>
                  <div className={styles.footerAvatar}>
                    {identity.logo ? <img src={identity.logo} alt="" /> : <span>{initials}</span>}
                  </div>
                  <div className={styles.businessCopy}>
                    <strong>{identity.name}</strong>
                    <small>{identity.label} عضو چاکود</small>
                  </div>
                </div>
                <div className={styles.brandWatermark} aria-label="ساخته‌شده با چاکود">
                  <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
                </div>
              </div>
            </article>

            <section className={styles.sharePanel} aria-label="اشتراک‌گذاری کارت روز">
              <button
                type="button"
                className={styles.sharePrimary}
                onClick={shareDailyCard}
                disabled={!shareFile || !businessLookupComplete}
              >
                {shareIcon()}
                <span>
                  <strong>{shareFile ? "اشتراک‌گذاری کارت" : "آماده‌سازی اشتراک…"}</strong>
                  <small>واتساپ، تلگرام، اینستاگرام و اپ‌های نصب‌شده</small>
                </span>
              </button>

              <div className={styles.shareSecondaryRow}>
                <button type="button" onClick={downloadDailyCard} disabled={!shareFile}>
                  ذخیره تصویر
                </button>
                <button type="button" onClick={copyShowroomLink}>
                  {shareState === "copied" ? "لینک کپی شد" : "کپی لینک ویترین"}
                </button>
              </div>

              <Link href={publicPath} className={styles.showroomLink}>
                مشاهده ویترین عمومی {identity.name}
              </Link>

              <p className={styles.shareHint}>
                تصویر اشتراکی یک QR به ویترین عمومی دارد و لینک ویترین هم همراه Share ارسال می‌شود.
              </p>
              {shareState === "error" ? (
                <p className={styles.shareError}>اشتراک مستقیم انجام نشد؛ تصویر را ذخیره یا لینک ویترین را کپی کن.</p>
              ) : null}
            </section>

            <p className={styles.caption}>کارت بر اساس حساب یا کسب‌وکار فعال ساخته می‌شود و برای امروز ثابت می‌ماند.</p>
          </>
        ) : null}
      </div>
      <MobileBottomNav />
    </main>
  );
}
