<?php
declare(strict_types=1);

require_once __DIR__ . "/auth-core.php";

chakod_auth_no_store_headers();

function chakod_admin_users_clean_text($value, int $maxLength): string {
    $value = trim((string)$value);
    $value = strip_tags($value);
    $value = preg_replace("/\\s+/u", " ", $value) ?: $value;
    return chakod_auth_text_length($value) > $maxLength
        ? chakod_auth_text_substr($value, 0, $maxLength)
        : $value;
}

function chakod_admin_users_can_view(array $identity): bool {
    if (!empty($identity["is_site_owner"])) return true;

    $admin = $identity["admin"] ?? null;
    if (!is_array($admin)) return false;

    return in_array(
        (string)($admin["role"] ?? ""),
        ["super_admin", "admin", "support", "moderator"],
        true
    );
}

function chakod_admin_users_can_manage(array $identity): bool {
    if (!empty($identity["is_site_owner"])) return true;

    $admin = $identity["admin"] ?? null;
    if (!is_array($admin)) return false;

    return in_array(
        (string)($admin["role"] ?? ""),
        ["super_admin", "admin"],
        true
    );
}

function chakod_admin_users_status(array $row): string {
    if (!empty($row["deleted_at"])) return "deleted";
    if (!empty($row["suspended_at"])) return "suspended";

    $status = strtolower(trim((string)($row["status"] ?? "active")));
    return $status !== "" ? $status : "active";
}

function chakod_admin_users_item(array $row): array {
    return [
        "id" => (int)($row["id"] ?? 0),
        "mobile" => chakod_auth_normalize_mobile((string)($row["mobile"] ?? "")),
        "full_name" => $row["full_name"] ?? null,
        "account_type" => (string)($row["account_type"] ?? "personal"),
        "business_name" => $row["business_name"] ?? null,
        "phone_verified" => (bool)($row["phone_verified"] ?? false),
        "terms_accepted" => (bool)($row["terms_accepted"] ?? false),
        "status" => chakod_admin_users_status($row),
        "created_at" => $row["created_at"] ?? null,
        "updated_at" => $row["updated_at"] ?? null,
        "last_login_at" => $row["last_login_at"] ?? null,
        "suspended_at" => $row["suspended_at"] ?? null,
        "deleted_at" => $row["deleted_at"] ?? null,
    ];
}

function chakod_admin_users_select_sql(array $columns): string {
    $wanted = [
        "id",
        "mobile",
        "full_name",
        "account_type",
        "business_name",
        "phone_verified",
        "terms_accepted",
        "status",
        "created_at",
        "updated_at",
        "last_login_at",
        "suspended_at",
        "deleted_at",
    ];

    $selected = [];
    foreach ($wanted as $column) {
        if (isset($columns[$column])) $selected[] = "u.`" . $column . "`";
    }

    return $selected ? implode(", ", $selected) : "u.id";
}

function chakod_admin_users_where(
    array $columns,
    string $query,
    string $status,
    string $accountType,
    array &$params
): string {
    $parts = [];

    if ($query !== "") {
        $searchParts = [];
        foreach (["mobile", "full_name", "business_name"] as $column) {
            if (!isset($columns[$column])) continue;
            $searchParts[] = "u.`" . $column . "` LIKE ?";
            $params[] = "%" . $query . "%";
        }

        if (ctype_digit($query) && isset($columns["id"])) {
            $searchParts[] = "u.id = ?";
            $params[] = (int)$query;
        }

        if ($searchParts) $parts[] = "(" . implode(" OR ", $searchParts) . ")";
    }

    if ($accountType !== "" && isset($columns["account_type"])) {
        $parts[] = "u.account_type = ?";
        $params[] = $accountType;
    }

    if ($status !== "") {
        if ($status === "deleted" && isset($columns["deleted_at"])) {
            $parts[] = "u.deleted_at IS NOT NULL";
        } elseif ($status === "suspended" && isset($columns["suspended_at"])) {
            $parts[] = "u.suspended_at IS NOT NULL";
        } elseif (isset($columns["status"])) {
            $parts[] = "u.status = ?";
            $params[] = $status;
        } elseif ($status === "active") {
            if (isset($columns["deleted_at"])) $parts[] = "u.deleted_at IS NULL";
            if (isset($columns["suspended_at"])) $parts[] = "u.suspended_at IS NULL";
        }
    }

    return $parts ? " WHERE " . implode(" AND ", $parts) : "";
}

try {
    $pdo = db();
    $auth = chakod_auth_current($pdo, true);
    $identity = chakod_auth_build_identity($pdo, $auth["user"]);

    if (!chakod_admin_users_can_view($identity)) {
        response_json([
            "success" => false,
            "message" => "دسترسی مشاهده کاربران برای این حساب فعال نیست."
        ], 403);
    }

    if (!chakod_auth_table_exists($pdo, "ck_auth_users")) {
        response_json([
            "success" => false,
            "message" => "جدول کاربران احراز هویت در دسترس نیست."
        ], 503);
    }

    $columns = chakod_auth_columns($pdo, "ck_auth_users");
    $method = strtoupper((string)($_SERVER["REQUEST_METHOD"] ?? "GET"));

    if ($method === "GET") {
        $query = chakod_admin_users_clean_text($_GET["q"] ?? "", 120);
        $status = strtolower(chakod_admin_users_clean_text($_GET["status"] ?? "", 30));
        $accountType = strtolower(chakod_admin_users_clean_text($_GET["account_type"] ?? "", 40));
        $limit = max(1, min(100, (int)($_GET["limit"] ?? 50)));
        $offset = max(0, (int)($_GET["offset"] ?? 0));

        $allowedStatuses = ["", "active", "suspended", "blocked", "disabled", "deleted"];
        if (!in_array($status, $allowedStatuses, true)) $status = "";

        $allowedAccountTypes = ["", "personal", "dealer", "parts_store", "repair_shop", "business"];
        if (!in_array($accountType, $allowedAccountTypes, true)) $accountType = "";

        $params = [];
        $where = chakod_admin_users_where($columns, $query, $status, $accountType, $params);

        $countStmt = $pdo->prepare("SELECT COUNT(*) FROM ck_auth_users u" . $where);
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        $orderColumn = isset($columns["created_at"]) ? "u.created_at" : "u.id";
        $select = chakod_admin_users_select_sql($columns);
        $listSql = "SELECT " . $select . " FROM ck_auth_users u" . $where .
            " ORDER BY " . $orderColumn . " DESC, u.id DESC LIMIT " . $limit . " OFFSET " . $offset;
        $listStmt = $pdo->prepare($listSql);
        $listStmt->execute($params);
        $items = array_map("chakod_admin_users_item", $listStmt->fetchAll(PDO::FETCH_ASSOC));

        $stats = ["total" => 0, "active" => 0, "suspended" => 0, "deleted" => 0, "business" => 0];
        $statsSelect = chakod_admin_users_select_sql($columns);
        $statsStmt = $pdo->query("SELECT " . $statsSelect . " FROM ck_auth_users u");
        foreach ($statsStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $stats["total"]++;
            $rowStatus = chakod_admin_users_status($row);
            if ($rowStatus === "suspended") $stats["suspended"]++;
            elseif ($rowStatus === "deleted") $stats["deleted"]++;
            elseif ($rowStatus === "active") $stats["active"]++;

            if ((string)($row["account_type"] ?? "personal") !== "personal") {
                $stats["business"]++;
            }
        }

        response_json([
            "success" => true,
            "items" => $items,
            "total" => $total,
            "limit" => $limit,
            "offset" => $offset,
            "stats" => $stats,
            "can_manage" => chakod_admin_users_can_manage($identity),
        ]);
    }

    if ($method !== "PATCH") {
        response_json([
            "success" => false,
            "message" => "Only GET or PATCH methods are allowed"
        ], 405);
    }

    if (!chakod_admin_users_can_manage($identity)) {
        response_json([
            "success" => false,
            "message" => "دسترسی تغییر وضعیت کاربران برای این حساب فعال نیست."
        ], 403);
    }

    $data = chakod_auth_json_body();
    $userId = (int)($data["user_id"] ?? 0);
    $action = strtolower(chakod_admin_users_clean_text($data["action"] ?? "", 30));

    if ($userId <= 0 || !in_array($action, ["suspend", "reactivate"], true)) {
        response_json([
            "success" => false,
            "message" => "درخواست مدیریت کاربر معتبر نیست."
        ], 422);
    }

    $currentUserId = (int)($auth["user"]["id"] ?? 0);
    if ($userId === $currentUserId) {
        response_json([
            "success" => false,
            "message" => "امکان تغییر وضعیت حساب مدیریتی فعلی از این صفحه وجود ندارد."
        ], 409);
    }

    $select = chakod_admin_users_select_sql($columns);
    $targetStmt = $pdo->prepare("SELECT " . $select . " FROM ck_auth_users u WHERE u.id = ? LIMIT 1");
    $targetStmt->execute([$userId]);
    $target = $targetStmt->fetch(PDO::FETCH_ASSOC);

    if (!$target) {
        response_json([
            "success" => false,
            "message" => "کاربر موردنظر پیدا نشد."
        ], 404);
    }

    $targetMobile = chakod_auth_normalize_mobile((string)($target["mobile"] ?? ""));
    if (
        defined("CHAKOD_OWNER_MOBILE") &&
        $targetMobile !== "" &&
        $targetMobile === chakod_auth_normalize_mobile((string)CHAKOD_OWNER_MOBILE)
    ) {
        response_json([
            "success" => false,
            "message" => "حساب مالک اصلی سایت از این مسیر قابل تعلیق نیست."
        ], 409);
    }

    if (!empty($target["deleted_at"])) {
        response_json([
            "success" => false,
            "message" => "حساب حذف‌شده از این مسیر قابل فعال‌سازی یا تعلیق نیست."
        ], 409);
    }

    $sets = [];
    $updateParams = [];

    if ($action === "suspend") {
        if (isset($columns["status"])) $sets[] = "status = 'suspended'";
        if (isset($columns["suspended_at"])) $sets[] = "suspended_at = NOW()";
    } else {
        if (isset($columns["status"])) $sets[] = "status = 'active'";
        if (isset($columns["suspended_at"])) $sets[] = "suspended_at = NULL";
    }

    if (isset($columns["updated_at"])) $sets[] = "updated_at = NOW()";

    if (!$sets) {
        response_json([
            "success" => false,
            "message" => "ستون‌های لازم برای مدیریت وضعیت حساب در دیتابیس موجود نیست."
        ], 501);
    }

    $pdo->beginTransaction();

    $updateParams[] = $userId;
    $update = $pdo->prepare("UPDATE ck_auth_users SET " . implode(", ", $sets) . " WHERE id = ?");
    $update->execute($updateParams);

    if ($action === "suspend" && chakod_auth_table_exists($pdo, "ck_auth_sessions")) {
        $sessionColumns = chakod_auth_columns($pdo, "ck_auth_sessions");
        if (isset($sessionColumns["revoked_at"]) && isset($sessionColumns["user_id"])) {
            $revoke = $pdo->prepare("UPDATE ck_auth_sessions SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL");
            $revoke->execute([$userId]);
        }
    }

    chakod_auth_log_event(
        $pdo,
        $action === "suspend" ? "admin.user.suspend" : "admin.user.reactivate",
        true,
        $currentUserId,
        (string)($auth["user"]["mobile"] ?? ""),
        ["target_user_id" => $userId, "target_mobile" => chakod_auth_mask_mobile($targetMobile)]
    );

    $pdo->commit();

    $targetStmt = $pdo->prepare("SELECT " . $select . " FROM ck_auth_users u WHERE u.id = ? LIMIT 1");
    $targetStmt->execute([$userId]);
    $updated = $targetStmt->fetch(PDO::FETCH_ASSOC);

    response_json([
        "success" => true,
        "message" => $action === "suspend" ? "حساب کاربر تعلیق شد." : "حساب کاربر دوباره فعال شد.",
        "item" => $updated ? chakod_admin_users_item($updated) : null,
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log("Chakod admin users endpoint failed: " . $e->getMessage());
    response_json([
        "success" => false,
        "message" => "مدیریت کاربران در حال حاضر در دسترس نیست."
    ], 500);
}
