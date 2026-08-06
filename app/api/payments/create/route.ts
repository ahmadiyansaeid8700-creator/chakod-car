import { NextRequest } from "next/server";

import {
  jsonResponse,
  proxyAuthenticatedJson,
  rejectCrossSiteMutation,
} from "../../../../lib/chakod-auth-proxy";
import { getCommerceCatalogItem } from "../../../../lib/commerce-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set(["wallet_charge", "promotion", "subscription"]);
const CODE_PATTERN = /^[a-z0-9_-]{2,64}$/i;

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: NextRequest) {
  const crossSiteResponse = rejectCrossSiteMutation(request);
  if (crossSiteResponse) return crossSiteResponse;

  let input: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    input = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return jsonResponse({ success: false, message: "اطلاعات پرداخت معتبر نیست." }, 400);
  }

  const type = cleanText(input.type, 32);
  const code = cleanText(input.code, 64);
  const callbackPath = cleanText(input.callback_path, 160);

  if (!ALLOWED_TYPES.has(type)) {
    return jsonResponse({ success: false, message: "نوع سفارش معتبر نیست." }, 400);
  }

  if (!CODE_PATTERN.test(code)) {
    return jsonResponse({ success: false, message: "کد محصول معتبر نیست." }, 400);
  }

  let amountToman = 0;
  let description = "";

  if (type === "wallet_charge") {
    amountToman = Math.round(Number(input.amount_toman || 0));
    description = "افزایش موجودی کیف پول چاکود";

    if (!Number.isSafeInteger(amountToman) || amountToman < 10_000 || amountToman > 500_000_000) {
      return jsonResponse({ success: false, message: "مبلغ افزایش موجودی معتبر نیست." }, 400);
    }
  } else {
    const product = getCommerceCatalogItem(type, code);
    if (!product) {
      return jsonResponse({ success: false, message: "محصول انتخاب‌شده معتبر یا فعال نیست." }, 400);
    }

    amountToman = product.amountToman;
    description = product.title;
  }

  const safeCallbackPath = callbackPath.startsWith("/account/payments/")
    ? callbackPath
    : "/account/payments/callback";
  const callbackUrl = new URL(safeCallbackPath, request.nextUrl.origin).toString();

  return proxyAuthenticatedJson(request, "/api/payments/create.php", {
    method: "POST",
    timeoutMs: 20_000,
    body: JSON.stringify({
      type,
      code,
      amount_toman: amountToman,
      description,
      callback_url: callbackUrl,
    }),
  });
}
