import { NextRequest } from "next/server";

import {
  jsonResponse,
  readSessionToken,
  rejectCrossSiteMutation,
} from "@/lib/chakod-auth-proxy";
import {
  ChakodAiProviderError,
  runChakodAiProvider,
} from "@/lib/chakod-ai-manager/provider";
import {
  ChakodAiToolError,
  runChakodAiReadOnlyTool,
} from "@/lib/chakod-ai-manager/tool-executor";
import { hasAdminRouteAccess } from "@/lib/route-access";
import { readServerIdentity } from "@/lib/server-route-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_QUESTION_CHARS = 2_500;

export async function POST(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  const identity = await readServerIdentity("/api/admin-me.php");

  if (!hasAdminRouteAccess(identity)) {
    return jsonResponse({ success: false, message: "Not found" }, 404);
  }

  const token = readSessionToken(request);
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonResponse({ success: false, message: "درخواست معتبر نیست." }, 400);
  }

  const question = readQuestion(body);

  if (!question) {
    return jsonResponse({ success: false, message: "متن درخواست AI الزامی است." }, 400);
  }

  if (question.length > MAX_QUESTION_CHARS) {
    return jsonResponse({ success: false, message: "متن درخواست بیش از حد طولانی است." }, 413);
  }

  try {
    const snapshot = await runChakodAiReadOnlyTool(
      "site_operations_summary",
      token,
    );

    const result = await runChakodAiProvider({
      instructions: [
        "تو دستیار مدیریتی چاکود هستی.",
        "فقط بر اساس Snapshot خلاصه و Sanitized ارائه‌شده تحلیل کن.",
        "اگر داده‌ای موجود نیست یا Tool خطا داده، آن را صریح بگو و حدس نزن.",
        "هیچ اقدام، تغییر، تأیید، رد، پرداخت یا ویرایشی را انجام‌شده اعلام نکن.",
        "خروجی فارسی، اجرایی و کوتاه باشد: ابتدا وضعیت کلی، سپس حداکثر 5 اولویت، سپس اقدام پیشنهادی مدیر.",
        "هیچ Secret، Token، شماره موبایل یا داده شخصی را درخواست نکن.",
      ].join("\n"),
      input: JSON.stringify({
        question,
        snapshot,
      }),
    });

    return jsonResponse(
      {
        success: true,
        suggestion: {
          provider: result.provider,
          model: result.model,
          text: result.text,
          generatedAt: new Date().toISOString(),
          writeActionsExecuted: false,
        },
      },
      200,
    );
  } catch (error) {
    if (error instanceof ChakodAiProviderError || error instanceof ChakodAiToolError) {
      return jsonResponse(
        { success: false, message: error.message, code: error.code },
        error.status,
      );
    }

    return jsonResponse(
      { success: false, message: "تحلیل مدیریتی AI انجام نشد." },
      500,
    );
  }
}

function readQuestion(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return "";
  const question = (value as Record<string, unknown>).question;
  return typeof question === "string" ? question.trim() : "";
}
