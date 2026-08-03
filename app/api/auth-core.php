<?php
declare(strict_types=1);

require_once __DIR__ . "/config.php";

function chakod_auth_no_store_headers(): void {
    header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
    header("Pragma: no-cache");
    header("Expires: 0");
}

function chakod_auth_json_body(): array {
    $contentLength = (int)($_SERVER["CONTENT_LENGTH"] ?? 0);

    if ($contentLength > 65536) {
        response_json([
            "success" => false,
            "message" => "حجم درخواست بیش از حد مجاز است."
        ], 413);
    }

    $raw = file_get_contents("php://input");

    if ($raw === false || trim((string)$raw) === "") {
        return [];
    }

    $data = json_decode((string)$raw, true);

    if (!is_array($data)) {
        response_json([
            "success" => false,
            "message" => "ساختار داده ارسالی معتبر نیست."
        ], 400);
    }

    return $data;
}

function chakod_auth_allowed_origins(): array {
    global $chakodAllowedOrigins;

    return is_array($chakodAllowedOrigins)
        ? array_values(array_unique(array_map("strval", $chakodAllowedOrigins)))
        : [];
}

function chakod_auth_request_origin(): string {
    $origin = trim((string)($_SERVER["HTTP_ORIGIN"] ?? ""));

    if ($origin !== "") {
        return rtrim($origin, "/");
    }

    $referer = trim((string)($_SERVER["HTTP_REFERER"] ?? ""));

    if ($referer === "") {
        return "";
    }

    $parts = parse_url($referer);

    if (!is_array($parts) || empty($parts["scheme"]) || empty($parts["host"])) {
        return "";
    }

    $origin = strtolower((string)$parts["scheme"]) . "://" . strtolower((string)$parts["host"]);

    if (!empty($parts["port"])) {
        $origin .= ":" . (int)$parts["port"];
    }

    return $origin;
}

function chakod_auth_origin_is_allowed(string $origin): bool {
    if ($origin === "") {
        return true;
    }

    return in_array(
        rtrim($origin, "/"),
        array_map(
            static fn(string $item): string => rtrim($item, "/"),
            chakod_auth_allowed_origins()
        ),
        true
    );
}

function chakod_auth_enforce_request_origin(): void {
    $origin = chakod_auth_request_origin();

    if ($origin !== "" && !chakod_auth_origin_is_allowed($origin)) {
        response_json([
            "success" => false,
            "message" => "مبدأ درخواست مجاز نیست."
        ], 403);
    }
}

function chakod_auth_is_state_changing_request(): bool {
    return in_array(
        strtoupper((string)($_SERVER["REQUEST_METHOD"] ?? "GET")),
        ["POST", "PUT", "PATCH", "DELETE"],
        true
    );
}

function chakod_auth_valid_session_token(string $token): bool {
    return preg_match("/^[a-f0-9]{64}$/i", $token) === 1;
}

function chakod_auth_text_length(string $value): int {
    if (function_exists("mb_strlen")) {
        return mb_strlen($value, "UTF-8");
    }

    if (function_exists("iconv_strlen")) {
        $length = iconv_strlen($value, "UTF-8");
        return $length === false ? strlen($value) : $length;
    }

    return strlen($value);
}

function chakod_auth_text_substr(string $value, int $start, int $length): string {
    if (function_exists("mb_substr")) {
        return mb_substr($value, $start, $length, "UTF-8");
    }

    if (function_exists("iconv_substr")) {
        $part = iconv_substr($value, $start, $length, "UTF-8");
        return $part === false ? substr($value, $start, $length) : $part;
    }

    return substr($value, $start, $length);
}

function chakod_auth_to_english_digits(string $value): string {
    $persian = ["۰","۱","۲","۳","۴","۵","۶","۷","۸","۹"];
    $arabic = ["٠","١","٢","٣","٤","٥","٦","٧","٨","٩"];
    $latin = ["0","1","2","3","4","5","6","7","8","9"];

    $value = str_replace($persian, $latin, $value);
    return str_replace($arabic, $latin, $value);
}

function chakod_auth_normalize_mobile($mobile): string {
    $mobile = chakod_auth_to_english_digits(trim((string)$mobile));
    $mobile = preg_replace("/[^0-9+]/", "", $mobile) ?: "";

    if (strpos($mobile, "+98") === 0) {
        $mobile = "0" . substr($mobile, 3);
    } elseif (strpos($mobile, "98") === 0 && strlen($mobile) === 12) {
        $mobile = "0" . substr($mobile, 2);
    } elseif (strlen($mobile) === 10 && strpos($mobile, "9") === 0) {
        $mobile = "0" . $mobile;
    }

    return $mobile;
}

function chakod_auth_mask_mobile(string $mobile): string {
    $mobile = chakod_auth_normalize_mobile($mobile);

    if (strlen($mobile) !== 11) {
        return $mobile;
    }

    return substr($mobile, 0, 4) . "****" . substr($mobile, -3);
}

function chakod_auth_headers(): array {
    $headers = [];

    if (function_exists("getallheaders")) {
        $received = getallheaders();
        if (is_array($received)) {
            $headers = $received;
        }
    }

    foreach ($_SERVER as $name => $value) {
        if (strpos($name, "HTTP_") !== 0) {
            continue;
        }

        $key = str_replace(
            " ",
            "-",
            ucwords(strtolower(str_replace("_", " ", substr($name, 5))))
        );

        if (!array_key_exists($key, $headers)) {
            $headers[$key] = $value;
        }
    }

    if (!empty($_SERVER["REDIRECT_HTTP_AUTHORIZATION"])) {
        $headers["Authorization"] =
            $_SERVER["REDIRECT_HTTP_AUTHORIZATION"];
    }

    if (!empty($_SERVER["HTTP_AUTHORIZATION"])) {
        $headers["Authorization"] = $_SERVER["HTTP_AUTHORIZATION"];
    }

    return $headers;
}

function chakod_auth_token_candidates(): array {
    $headers = chakod_auth_headers();
    $result = [];
    $seen = [];

    $add = static function (
        array &$result,
        array &$seen,
        string $source,
        string $token
    ): void {
        $token = trim($token);

        if (
            !chakod_auth_valid_session_token($token) ||
            isset($seen[$token])
        ) {
            return;
        }

        $seen[$token] = true;
        $result[] = ["source" => $source, "token" => $token];
    };

    foreach ($headers as $key => $value) {
        if (
            strtolower((string)$key) === "authorization" &&
            preg_match("/^\s*Bearer\s+(.+)\s*$/i", (string)$value, $m)
        ) {
            $add($result, $seen, "bearer", (string)$m[1]);
        }
    }

    foreach ($headers as $key => $value) {
        if (
            in_array(strtolower((string)$key), [
                "x-session-token",
                "x-auth-token",
                "chakod-session-token"
            ], true)
        ) {
            $add($result, $seen, "header", (string)$value);
        }
    }

    if (!empty($_COOKIE[CHAKOD_SESSION_COOKIE])) {
        $add(
            $result,
            $seen,
            "cookie",
            (string)$_COOKIE[CHAKOD_SESSION_COOKIE]
        );
    }

    if (
        defined("CHAKOD_LEGACY_SESSION_COOKIE") &&
        !empty($_COOKIE[CHAKOD_LEGACY_SESSION_COOKIE])
    ) {
        $add(
            $result,
            $seen,
            "legacy_cookie",
            (string)$_COOKIE[CHAKOD_LEGACY_SESSION_COOKIE]
        );
    }

    return $result;
}

function chakod_auth_is_https(): bool {
    if (
        !empty($_SERVER["HTTPS"]) &&
        strtolower((string)$_SERVER["HTTPS"]) !== "off"
    ) {
        return true;
    }

    if (
        !empty($_SERVER["HTTP_X_FORWARDED_PROTO"]) &&
        strtolower((string)$_SERVER["HTTP_X_FORWARDED_PROTO"]) === "https"
    ) {
        return true;
    }

    $host = strtolower((string)($_SERVER["HTTP_HOST"] ?? ""));
    $host = preg_replace("/:\d+$/", "", $host) ?: $host;

    return in_array($host, ["api.chakod.com", "www.api.chakod.com"], true);
}

function chakod_auth_cookie_options(int $expiresAt): array {
    return [
        "expires" => $expiresAt,
        "path" => "/",
        "domain" => ".chakod.com",
        "secure" => true,
        "httponly" => true,
        "samesite" => "Lax",
    ];
}

function chakod_auth_set_cookie(string $token, int $expiresAt): void {
    if (!chakod_auth_valid_session_token($token)) {
        throw new InvalidArgumentException("Invalid session token format.");
    }

    setcookie(
        CHAKOD_SESSION_COOKIE,
        $token,
        chakod_auth_cookie_options($expiresAt)
    );

    if (defined("CHAKOD_LEGACY_SESSION_COOKIE")) {
        setcookie(
            CHAKOD_LEGACY_SESSION_COOKIE,
            "",
            chakod_auth_cookie_options(time() - 3600)
        );
    }
}

function chakod_auth_clear_cookie(): void {
    setcookie(
        CHAKOD_SESSION_COOKIE,
        "",
        chakod_auth_cookie_options(time() - 3600)
    );

    if (defined("CHAKOD_LEGACY_SESSION_COOKIE")) {
        setcookie(
            CHAKOD_LEGACY_SESSION_COOKIE,
            "",
            chakod_auth_cookie_options(time() - 3600)
        );
    }
}

function chakod_auth_client_ip(): string {
    $ip = "";

    if (!empty($_SERVER["HTTP_CF_CONNECTING_IP"])) {
        $candidate = trim((string)$_SERVER["HTTP_CF_CONNECTING_IP"]);

        if (filter_var($candidate, FILTER_VALIDATE_IP)) {
            $ip = $candidate;
        }
    }

    if ($ip === "" && !empty($_SERVER["REMOTE_ADDR"])) {
        $candidate = trim((string)$_SERVER["REMOTE_ADDR"]);

        if (filter_var($candidate, FILTER_VALIDATE_IP)) {
            $ip = $candidate;
        }
    }

    return substr($ip, 0, 64);
}

function chakod_auth_user_agent(): string {
    return substr((string)($_SERVER["HTTP_USER_AGENT"] ?? ""), 0, 500);
}

function chakod_auth_table_exists(PDO $pdo, string $table): bool {
    static $cache = [];

    if (array_key_exists($table, $cache)) {
        return $cache[$table];
    }

    $stmt = $pdo->prepare("
        SELECT COUNT(*)
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
    ");
    $stmt->execute([$table]);

    $cache[$table] = (int)$stmt->fetchColumn() > 0;
    return $cache[$table];
}

function chakod_auth_columns(PDO $pdo, string $table): array {
    static $cache = [];

    if (isset($cache[$table])) {
        return $cache[$table];
    }

    if (!chakod_auth_table_exists($pdo, $table)) {
        return $cache[$table] = [];
    }

    $stmt = $pdo->prepare("
        SELECT COLUMN_NAME
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
    ");
    $stmt->execute([$table]);

    $columns = [];
    foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) as $column) {
        $columns[(string)$column] = true;
    }

    return $cache[$table] = $columns;
}

function chakod_auth_log_event(
    PDO $pdo,
    string $eventType,
    bool $success,
    ?int $userId = null,
    ?string $mobile = null,
    array $meta = []
): void {
    if (!chakod_auth_table_exists($pdo, "ck_auth_security_events")) {
        return;
    }

    try {
        $stmt = $pdo->prepare("
            INSERT INTO ck_auth_security_events
            (
                user_id,
                mobile,
                event_type,
                success,
                ip_address,
                user_agent,
                meta_json,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ");

        $stmt->execute([
            $userId,
            $mobile ? chakod_auth_normalize_mobile($mobile) : null,
            substr($eventType, 0, 80),
            $success ? 1 : 0,
            chakod_auth_client_ip(),
            chakod_auth_user_agent(),
            $meta
                ? json_encode(
                    $meta,
                    JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
                )
                : null,
        ]);
    } catch (Throwable $e) {
        error_log(
            "Chakod auth security event log failed: " . $e->getMessage()
        );
    }
}

function chakod_auth_find_session_by_token(
    PDO $pdo,
    string $token
): ?array {
    if ($token === "") {
        return null;
    }

    $columns = chakod_auth_columns($pdo, "ck_auth_users");
    $statusSelect = isset($columns["status"]) ? ", u.status" : "";
    $suspendedSelect = isset($columns["suspended_at"])
        ? ", u.suspended_at"
        : "";
    $deletedSelect = isset($columns["deleted_at"])
        ? ", u.deleted_at"
        : "";
    $businessCitySelect = isset($columns["business_city"])
        ? ", u.business_city"
        : "";
    $businessLocationModeSelect = isset($columns["business_location_mode"])
        ? ", u.business_location_mode"
        : "";
    $businessLocationLabelSelect = isset($columns["business_location_label"])
        ? ", u.business_location_label"
        : "";
    $businessLocationScopesSelect = isset($columns["business_location_scopes"])
        ? ", u.business_location_scopes"
        : "";

    $stmt = $pdo->prepare("
        SELECT
            s.id AS session_id,
            s.expires_at AS session_expires_at,
            s.created_at AS session_created_at,
            u.id,
            u.mobile,
            u.full_name,
            u.account_type,
            u.business_name
            $businessCitySelect
            $businessLocationModeSelect
            $businessLocationLabelSelect
            $businessLocationScopesSelect,
            u.phone_verified,
            u.terms_accepted,
            u.terms_version,
            u.created_at,
            u.updated_at,
            u.last_login_at
            $statusSelect
            $suspendedSelect
            $deletedSelect
        FROM ck_auth_sessions s
        INNER JOIN ck_auth_users u ON u.id = s.user_id
        WHERE s.session_token_hash = ?
          AND s.revoked_at IS NULL
          AND s.expires_at > NOW()
        LIMIT 1
    ");

    $stmt->execute([hash("sha256", $token)]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    return $row ?: null;
}

function chakod_auth_user_is_blocked(array $user): bool {
    $status = strtolower(trim((string)($user["status"] ?? "active")));

    return in_array(
        $status,
        ["suspended", "deleted", "blocked", "disabled"],
        true
    ) ||
        !empty($user["suspended_at"]) ||
        !empty($user["deleted_at"]);
}

function chakod_auth_current(PDO $pdo, bool $required = false): ?array {
    $hadCookie = false;

    foreach (chakod_auth_token_candidates() as $candidate) {
        if (($candidate["source"] ?? "") === "cookie") {
            $hadCookie = true;
        }

        $row = chakod_auth_find_session_by_token(
            $pdo,
            (string)($candidate["token"] ?? "")
        );

        if (!$row) {
            continue;
        }

        if (
            in_array((string)($candidate["source"] ?? ""), ["cookie", "legacy_cookie"], true) &&
            chakod_auth_is_state_changing_request()
        ) {
            chakod_auth_enforce_request_origin();
        }

        if (chakod_auth_user_is_blocked($row)) {
            $stmt = $pdo->prepare("
                UPDATE ck_auth_sessions
                SET revoked_at = NOW()
                WHERE id = ?
                  AND revoked_at IS NULL
            ");
            $stmt->execute([(int)$row["session_id"]]);
            chakod_auth_clear_cookie();

            if ($required) {
                response_json([
                    "success" => false,
                    "logged_in" => false,
                    "message" => "حساب کاربری شما غیرفعال شده است."
                ], 403);
            }

            return null;
        }

        return [
            "session" => [
                "id" => (int)$row["session_id"],
                "expires_at" => $row["session_expires_at"],
                "created_at" => $row["session_created_at"],
                "token_source" => $candidate["source"],
            ],
            "user" => $row,
            "token" => (string)$candidate["token"],
        ];
    }

    if ($hadCookie) {
        chakod_auth_clear_cookie();
    }

    if ($required) {
        response_json([
            "success" => false,
            "logged_in" => false,
            "message" => "نشست کاربری معتبر نیست. دوباره وارد شوید."
        ], 401);
    }

    return null;
}

function chakod_auth_link_invitations(
    PDO $pdo,
    int $userId,
    string $mobile
): void {
    $mobile = chakod_auth_normalize_mobile($mobile);

    if (chakod_auth_table_exists($pdo, "ck_dealer_members")) {
        $stmt = $pdo->prepare("
            UPDATE ck_dealer_members
            SET
                auth_user_id = ?,
                status = 'active',
                joined_at = COALESCE(joined_at, NOW()),
                updated_at = NOW()
            WHERE invited_mobile = ?
              AND (auth_user_id IS NULL OR auth_user_id = ?)
              AND status = 'invited'
        ");
        $stmt->execute([$userId, $mobile, $userId]);

        if (chakod_auth_table_exists($pdo, "ck_dealer_member_branches")) {
            $stmt = $pdo->prepare("
                UPDATE ck_dealer_member_branches mb
                INNER JOIN ck_dealer_members m
                    ON m.id = mb.dealer_member_id
                SET
                    mb.status = 'active',
                    mb.updated_at = NOW()
                WHERE m.auth_user_id = ?
                  AND m.invited_mobile = ?
                  AND m.status = 'active'
                  AND mb.status = 'invited'
            ");
            $stmt->execute([$userId, $mobile]);
        }
    }

    if (chakod_auth_table_exists($pdo, "ck_admin_users")) {
        $stmt = $pdo->prepare("
            UPDATE ck_admin_users
            SET
                auth_user_id = ?,
                activated_at = COALESCE(activated_at, NOW()),
                updated_at = NOW()
            WHERE invited_mobile = ?
              AND auth_user_id IS NULL
              AND status = 'active'
        ");
        $stmt->execute([$userId, $mobile]);
    }
}

function chakod_auth_admin_permissions(string $role): array {
    $map = [
        "super_admin" => [
            "dashboard.view",
            "listings.view",
            "listings.manage",
            "listings.approve",
            "listings.reject",
            "listings.needs_edit",
            "stories.view",
            "stories.manage",
            "banners.view",
            "banners.manage",
            "ai_review.manage",
        ],
        "admin" => [
            "dashboard.view",
            "listings.view",
            "listings.manage",
            "listings.approve",
            "listings.reject",
            "listings.needs_edit",
            "stories.view",
            "stories.manage",
            "banners.view",
            "banners.manage",
            "ai_review.view",
        ],
        "moderator" => [
            "dashboard.view",
            "listings.view",
            "listings.manage",
            "listings.approve",
            "listings.reject",
            "listings.needs_edit",
            "stories.view",
            "stories.manage",
            "banners.view",
            "ai_review.view",
        ],
        "finance" => [
            "dashboard.view",
        ],
        "support" => [
            "dashboard.view",
            "listings.view",
            "stories.view",
            "banners.view",
        ],
        "viewer" => [
            "dashboard.view",
            "listings.view",
        ],
    ];

    return $map[$role] ?? $map["viewer"];
}

function chakod_auth_dealer_permissions(string $role): array {
    $map = [
        "owner" => [
            "dealer.view",
            "dealer.settings.manage",
            "dealer.branches.manage",
            "dealer.members.manage",
            "dealer.listings.manage",
            "dealer.stories.manage",
            "dealer.banners.manage",
            "dealer.wallet.view",
            "dealer.payments.view",
            "dealer.reports.view",
        ],
        "manager" => [
            "dealer.view",
            "dealer.branch.settings.manage",
            "dealer.listings.manage",
            "dealer.stories.manage",
            "dealer.banners.manage",
            "dealer.reports.view",
        ],
        "branch_manager" => [
            "dealer.view",
            "dealer.branch.settings.manage",
            "dealer.listings.manage",
            "dealer.stories.manage",
            "dealer.banners.manage",
            "dealer.reports.view",
        ],
        "sales" => [
            "dealer.view",
            "dealer.listings.manage",
            "dealer.stories.manage",
        ],
        "content" => [
            "dealer.view",
            "dealer.listings.manage",
            "dealer.stories.manage",
            "dealer.banners.manage",
        ],
        "finance" => [
            "dealer.view",
            "dealer.wallet.view",
            "dealer.payments.view",
            "dealer.reports.view",
        ],
        "viewer" => ["dealer.view"],
    ];

    return $map[$role] ?? $map["viewer"];
}

function chakod_auth_get_active_admin(
    PDO $pdo,
    int $userId,
    string $mobile
): ?array {
    if (!chakod_auth_table_exists($pdo, "ck_admin_users")) {
        return null;
    }

    $stmt = $pdo->prepare("
        SELECT *
        FROM ck_admin_users
        WHERE status = 'active'
          AND (
              auth_user_id = ?
              OR invited_mobile = ?
          )
        ORDER BY
            CASE role
                WHEN 'super_admin' THEN 1
                WHEN 'admin' THEN 2
                WHEN 'moderator' THEN 3
                WHEN 'finance' THEN 4
                WHEN 'support' THEN 5
                ELSE 9
            END,
            id ASC
        LIMIT 1
    ");
    $stmt->execute([$userId, $mobile]);

    $admin = $stmt->fetch(PDO::FETCH_ASSOC);
    return $admin ?: null;
}

function chakod_auth_get_legacy_user_id(
    PDO $pdo,
    string $mobile
): int {
    foreach (["ck_users", "users"] as $table) {
        if (!chakod_auth_table_exists($pdo, $table)) {
            continue;
        }

        $columns = chakod_auth_columns($pdo, $table);

        if (!isset($columns["id"])) {
            continue;
        }

        $mobileColumn = null;

        foreach (["mobile", "phone", "mobile_number"] as $candidate) {
            if (isset($columns[$candidate])) {
                $mobileColumn = $candidate;
                break;
            }
        }

        if (!$mobileColumn) {
            continue;
        }

        $stmt = $pdo->prepare("
            SELECT id
            FROM `$table`
            WHERE `$mobileColumn` = ?
            LIMIT 1
        ");
        $stmt->execute([$mobile]);

        $id = (int)$stmt->fetchColumn();

        if ($id > 0) {
            return $id;
        }
    }

    return 0;
}

function chakod_auth_get_dealer_branches(
    PDO $pdo,
    int $dealerId,
    ?int $memberId,
    bool $owner
): array {
    if (
        !chakod_auth_table_exists($pdo, "ck_dealer_branches") ||
        !chakod_auth_table_exists($pdo, "ck_dealer_member_branches")
    ) {
        return [];
    }

    if ($owner) {
        $stmt = $pdo->prepare("
            SELECT
                b.id AS branch_id,
                b.name AS branch_name,
                b.public_slug,
                b.branch_code,
                b.province,
                b.city,
                b.neighborhood,
                b.is_headquarters,
                b.status AS branch_status,
                'owner' AS branch_role,
                b.is_headquarters AS is_primary
            FROM ck_dealer_branches b
            WHERE b.dealer_id = ?
              AND b.status <> 'archived'
            ORDER BY b.is_headquarters DESC, b.id ASC
        ");
        $stmt->execute([$dealerId]);
    } else {
        if (!$memberId) {
            return [];
        }

        $stmt = $pdo->prepare("
            SELECT
                b.id AS branch_id,
                b.name AS branch_name,
                b.public_slug,
                b.branch_code,
                b.province,
                b.city,
                b.neighborhood,
                b.is_headquarters,
                b.status AS branch_status,
                mb.role AS branch_role,
                mb.is_primary
            FROM ck_dealer_member_branches mb
            INNER JOIN ck_dealer_branches b ON b.id = mb.branch_id
            WHERE mb.dealer_member_id = ?
              AND b.dealer_id = ?
              AND mb.status = 'active'
              AND b.status <> 'archived'
            ORDER BY mb.is_primary DESC, b.is_headquarters DESC, b.id ASC
        ");
        $stmt->execute([$memberId, $dealerId]);
    }

    $branches = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $role = (string)($row["branch_role"] ?? "viewer");
        $branches[] = [
            "branch_id" => (int)$row["branch_id"],
            "branch_name" => $row["branch_name"],
            "public_slug" => $row["public_slug"],
            "branch_code" => $row["branch_code"],
            "province" => $row["province"],
            "city" => $row["city"],
            "neighborhood" => $row["neighborhood"],
            "is_headquarters" => (bool)$row["is_headquarters"],
            "branch_status" => $row["branch_status"],
            "role" => $role,
            "is_primary" => (bool)$row["is_primary"],
            "permissions" => chakod_auth_dealer_permissions($role),
        ];
    }

    return $branches;
}

function chakod_auth_get_dealers(
    PDO $pdo,
    int $userId,
    string $mobile
): array {
    if (!chakod_auth_table_exists($pdo, "ck_dealers")) {
        return [];
    }

    $result = [];
    $seen = [];
    $params = [$userId];
    $ownerConditions = ["d.auth_user_id = ?"];

    $legacyUserId = chakod_auth_get_legacy_user_id($pdo, $mobile);

    if ($legacyUserId > 0) {
        $ownerConditions[] = "d.user_id = ?";
        $params[] = $legacyUserId;
    }

    $stmt = $pdo->prepare("
        SELECT
            d.id AS dealer_id,
            COALESCE(
                NULLIF(d.dealer_name, ''),
                NULLIF(d.name, ''),
                'نمایشگاه چاکود'
            ) AS dealer_name,
            'owner' AS role,
            d.is_verified,
            d.is_active
        FROM ck_dealers d
        WHERE d.is_active = 1
          AND (" . implode(" OR ", $ownerConditions) . ")
    ");
    $stmt->execute($params);

    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $dealerId = (int)$row["dealer_id"];
        $branches = chakod_auth_get_dealer_branches(
            $pdo,
            $dealerId,
            null,
            true
        );

        $seen[$dealerId] = true;
        $row["dealer_id"] = $dealerId;
        $row["is_verified"] = (bool)$row["is_verified"];
        $row["is_active"] = (bool)$row["is_active"];
        $row["member_id"] = null;
        $row["scope"] = "all_branches";
        $row["branches"] = $branches;
        $row["branch_ids"] = array_values(array_map(
            static fn(array $branch): int => (int)$branch["branch_id"],
            $branches
        ));
        $row["permissions"] = chakod_auth_dealer_permissions("owner");
        $result[] = $row;
    }

    if (chakod_auth_table_exists($pdo, "ck_dealer_members")) {
        $stmt = $pdo->prepare("
            SELECT
                m.id AS member_id,
                d.id AS dealer_id,
                COALESCE(
                    NULLIF(d.dealer_name, ''),
                    NULLIF(d.name, ''),
                    'نمایشگاه چاکود'
                ) AS dealer_name,
                m.role,
                d.is_verified,
                d.is_active
            FROM ck_dealer_members m
            INNER JOIN ck_dealers d ON d.id = m.dealer_id
            WHERE d.is_active = 1
              AND m.status = 'active'
              AND (
                  m.auth_user_id = ?
                  OR m.invited_mobile = ?
              )
            ORDER BY m.id ASC
        ");
        $stmt->execute([$userId, $mobile]);

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $dealerId = (int)$row["dealer_id"];

            if (isset($seen[$dealerId])) {
                continue;
            }

            $memberId = (int)$row["member_id"];
            $branches = chakod_auth_get_dealer_branches(
                $pdo,
                $dealerId,
                $memberId,
                false
            );

            if (
                chakod_auth_table_exists($pdo, "ck_dealer_member_branches") &&
                !$branches
            ) {
                continue;
            }

            $permissions = [];
            foreach ($branches as $branch) {
                $permissions = array_merge(
                    $permissions,
                    $branch["permissions"] ?? []
                );
            }

            if (!$permissions) {
                $permissions = chakod_auth_dealer_permissions(
                    (string)($row["role"] ?? "viewer")
                );
            }

            $seen[$dealerId] = true;
            $row["dealer_id"] = $dealerId;
            $row["member_id"] = $memberId;
            $row["is_verified"] = (bool)$row["is_verified"];
            $row["is_active"] = (bool)$row["is_active"];
            $row["scope"] = "assigned_branches";
            $row["branches"] = $branches;
            $row["branch_ids"] = array_values(array_map(
                static fn(array $branch): int => (int)$branch["branch_id"],
                $branches
            ));
            $row["permissions"] = array_values(array_unique($permissions));
            $result[] = $row;
        }
    }

    return $result;
}

function chakod_auth_ensure_site_owner_admin(
    PDO $pdo,
    array $user
): void {
    $mobile = chakod_auth_normalize_mobile(
        (string)($user["mobile"] ?? "")
    );

    if (
        $mobile !== chakod_auth_normalize_mobile(
            (string)CHAKOD_OWNER_MOBILE
        ) ||
        !chakod_auth_table_exists($pdo, "ck_admin_users")
    ) {
        return;
    }

    $userId = (int)($user["id"] ?? 0);
    $displayName = trim((string)($user["full_name"] ?? ""));

    if ($displayName === "") {
        $displayName = "مدیر اصلی چاکود";
    }

    $find = $pdo->prepare("
        SELECT id
        FROM ck_admin_users
        WHERE auth_user_id = ?
           OR invited_mobile = ?
        ORDER BY id ASC
        LIMIT 1
    ");
    $find->execute([$userId, $mobile]);
    $adminId = (int)$find->fetchColumn();

    if ($adminId > 0) {
        $stmt = $pdo->prepare("
            UPDATE ck_admin_users
            SET
                auth_user_id = ?,
                invited_mobile = ?,
                role = 'super_admin',
                status = 'active',
                display_name = ?,
                activated_at = COALESCE(activated_at, NOW()),
                updated_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([
            $userId,
            $mobile,
            $displayName,
            $adminId
        ]);
        return;
    }

    $stmt = $pdo->prepare("
        INSERT INTO ck_admin_users
        (
            auth_user_id,
            invited_mobile,
            role,
            status,
            display_name,
            notes,
            activated_at,
            created_at,
            updated_at
        )
        VALUES (?, ?, 'super_admin', 'active', ?, ?, NOW(), NOW(), NOW())
    ");
    $stmt->execute([
        $userId,
        $mobile,
        $displayName,
        "مالک اصلی سایت - فعال‌سازی امن بر اساس شماره احرازشده"
    ]);
}

function chakod_auth_profile_is_complete(array $user): bool {
    $fullName = trim((string)($user["full_name"] ?? ""));
    $accountType = strtolower(trim((string)($user["account_type"] ?? "personal")));
    $businessName = trim((string)($user["business_name"] ?? ""));
    $businessCity = trim((string)($user["business_city"] ?? ""));
    $businessLocationLabel = trim((string)(
        $user["business_location_label"] ?? $businessCity
    ));

    if (
        chakod_auth_text_length($fullName) < 2 ||
        $accountType === "business"
    ) {
        return false;
    }

    if ($accountType !== "personal") {
        return
            chakod_auth_text_length($businessName) >= 2 &&
            chakod_auth_text_length($businessLocationLabel) >= 2;
    }

    return true;
}

function chakod_auth_role_title(string $role): string {
    $titles = [
        "site_owner" => "مدیریت کل سایت",
        "admin" => "ادمین سایت",
        "dealer_owner" => "مالک نمایشگاه",
        "dealer_member" => "عضو نمایشگاه",
        "personal" => "کاربر شخصی",
    ];

    return $titles[$role] ?? "کاربر چاکود";
}

function chakod_auth_build_identity(
    PDO $pdo,
    array $user
): array {
    $userId = (int)($user["id"] ?? 0);
    $mobile = chakod_auth_normalize_mobile(
        (string)($user["mobile"] ?? "")
    );

    $businessLocationScopes = [];
    $rawBusinessLocationScopes = $user["business_location_scopes"] ?? null;
    if (is_string($rawBusinessLocationScopes) && $rawBusinessLocationScopes !== "") {
        $decodedScopes = json_decode($rawBusinessLocationScopes, true);
        if (is_array($decodedScopes)) {
            $businessLocationScopes = $decodedScopes;
        }
    } elseif (is_array($rawBusinessLocationScopes)) {
        $businessLocationScopes = $rawBusinessLocationScopes;
    }

    $normalizedUser = [
        "id" => $userId,
        "mobile" => $mobile,
        "mobile_masked" => chakod_auth_mask_mobile($mobile),
        "full_name" => $user["full_name"] ?? null,
        "account_type" => $user["account_type"] ?? "personal",
        "business_name" => $user["business_name"] ?? null,
        "business_city" => $user["business_city"] ?? null,
        "business_location_mode" => $user["business_location_mode"] ?? null,
        "business_location_label" => $user["business_location_label"] ?? ($user["business_city"] ?? null),
        "business_location_scopes" => $businessLocationScopes,
        "phone_verified" => (bool)($user["phone_verified"] ?? false),
        "mobile_verified" => (bool)($user["phone_verified"] ?? false),
        "terms_accepted" => (bool)($user["terms_accepted"] ?? false),
        "accepted_terms" => (bool)($user["terms_accepted"] ?? false),
        "terms_version" => $user["terms_version"] ?? null,
        "profile_completed" => chakod_auth_profile_is_complete($user),
        "created_at" => $user["created_at"] ?? null,
        "last_login_at" => $user["last_login_at"] ?? null,
    ];

    $displayName = trim((string)(
        $normalizedUser["full_name"] ?? ""
    ));

    if (
        in_array(
            $normalizedUser["account_type"],
            ["dealer", "parts_store", "repair_shop", "business"],
            true
        ) &&
        trim((string)(
            $normalizedUser["business_name"] ?? ""
        )) !== ""
    ) {
        $displayName = trim(
            (string)$normalizedUser["business_name"]
        );
    }

    if ($displayName === "") {
        $displayName = "همراه چاکود";
    }

    $normalizedUser["display_name"] = $displayName;

    $isSiteOwner = $mobile !== "" &&
        $mobile === chakod_auth_normalize_mobile(
            (string)CHAKOD_OWNER_MOBILE
        );

    if ($isSiteOwner) {
        chakod_auth_ensure_site_owner_admin(
            $pdo,
            $normalizedUser
        );
    }

    $admin = chakod_auth_get_active_admin(
        $pdo,
        $userId,
        $mobile
    );
    $dealers = chakod_auth_get_dealers(
        $pdo,
        $userId,
        $mobile
    );

    $roles = [];
    $permissions = [
        "account.view",
        "account.edit",
        "listings.create",
        "listings.own.manage",
        "favorites.manage",
    ];

    if ($isSiteOwner) {
        $roles[] = "site_owner";
        $permissions = array_merge($permissions, [
            "*",
            "site.manage",
            "settings.manage",
            "pricing.manage",
        ]);
    }

    if ($admin) {
        $roles[] = "admin";
        $permissions = array_merge(
            $permissions,
            chakod_auth_admin_permissions(
                (string)($admin["role"] ?? "viewer")
            )
        );
    }

    foreach ($dealers as $dealer) {
        $roles[] = ($dealer["role"] ?? "") === "owner"
            ? "dealer_owner"
            : "dealer_member";

        $permissions = array_merge(
            $permissions,
            $dealer["permissions"] ?? []
        );
    }

    if (!$roles) {
        $roles[] = "personal";
    }

    $roles = array_values(array_unique($roles));
    $permissions = array_values(array_unique($permissions));

    if ($isSiteOwner) {
        $primaryRole = "site_owner";
        $redirectTo = "/admin/settings";
    } elseif ($admin) {
        $primaryRole = "admin";
        $redirectTo = "/admin";
    } elseif (in_array("dealer_owner", $roles, true)) {
        $primaryRole = "dealer_owner";
        $redirectTo = "/dashboard";
    } elseif (in_array("dealer_member", $roles, true)) {
        $primaryRole = "dealer_member";
        $redirectTo = "/dashboard";
    } else {
        $primaryRole = "personal";
        $redirectTo = "/account";
    }

    return [
        "user" => $normalizedUser,
        "roles" => $roles,
        "primary_role" => $primaryRole,
        "role_title" => chakod_auth_role_title($primaryRole),
        "permissions" => $permissions,
        "redirect_to" => $redirectTo,
        "is_site_owner" => $isSiteOwner,
"admin" => $admin
    ? [
        "id" => (int)$admin["id"],
        "auth_user_id" => (int)(
            $admin["auth_user_id"] ?? $userId
        ),
        "role" => (string)$admin["role"],
        "status" => (string)(
            $admin["status"] ?? ""
        ),
        "display_name" =>
            $admin["display_name"] ?? null,
    ]
    : null,
        "dealers" => $dealers,
    ];
}

function chakod_auth_has_permission(
    array $identity,
    string $permission
): bool {
    $permissions = $identity["permissions"] ?? [];

    return in_array("*", $permissions, true) ||
        in_array($permission, $permissions, true);
}
