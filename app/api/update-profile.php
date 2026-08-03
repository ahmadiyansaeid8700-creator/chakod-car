<?php
declare(strict_types=1);

require_once __DIR__ . "/auth-core.php";

chakod_auth_no_store_headers();

if (!in_array(($_SERVER["REQUEST_METHOD"] ?? ""), ["POST", "PUT", "PATCH"], true)) {
    response_json([
        "success" => false,
        "message" => "Only POST, PUT or PATCH methods are allowed"
    ], 405);
}

function chakod_profile_clean_text($value, int $maxLength): string {
    $value = trim((string)$value);
    $value = strip_tags($value);
    $value = str_replace(["ي", "ك"], ["ی", "ک"], $value);
    $value = preg_replace("/\\s+/u", " ", $value) ?: $value;

    if (chakod_auth_text_length($value) > $maxLength) {
        $value = chakod_auth_text_substr($value, 0, $maxLength);
    }

    return $value;
}

function chakod_profile_unique_texts($values, int $maxItems, int $maxLength): array {
    if (!is_array($values)) return [];

    $result = [];
    $seen = [];

    foreach ($values as $value) {
        $text = chakod_profile_clean_text($value, $maxLength);
        if ($text === "" || isset($seen[$text])) continue;

        $seen[$text] = true;
        $result[] = $text;
        if (count($result) >= $maxItems) break;
    }

    return $result;
}

function chakod_profile_normalize_location($rawScopes): array {
    if (!is_array($rawScopes)) $rawScopes = [];

    $scopes = [];
    $provinceSeen = [];
    $selectedItemCount = 0;

    foreach ($rawScopes as $rawScope) {
        if (!is_array($rawScope)) continue;

        $province = chakod_profile_clean_text($rawScope["province"] ?? "", 100);
        if ($province === "" || isset($provinceSeen[$province])) continue;
        if (count($scopes) >= 6 || $selectedItemCount >= 24) break;

        $allCities = !empty($rawScope["allCities"]);
        $cities = [];
        $areas = [];

        if ($allCities) {
            $selectedItemCount++;
        } else {
            $cities = chakod_profile_unique_texts(
                $rawScope["cities"] ?? [],
                max(0, 24 - $selectedItemCount),
                100
            );
            $selectedItemCount += count($cities);
            $citySeen = array_fill_keys($cities, true);

            $rawAreas = $rawScope["areas"] ?? [];
            if (is_array($rawAreas)) {
                foreach ($rawAreas as $rawArea) {
                    if (!is_array($rawArea) || $selectedItemCount >= 24) continue;

                    $city = chakod_profile_clean_text($rawArea["city"] ?? "", 100);
                    if ($city === "" || isset($citySeen[$city])) continue;

                    $allNeighborhoods = !empty($rawArea["allNeighborhoods"]);
                    $neighborhoods = $allNeighborhoods
                        ? []
                        : chakod_profile_unique_texts(
                            $rawArea["neighborhoods"] ?? [],
                            max(0, 24 - $selectedItemCount),
                            120
                        );

                    if (!$allNeighborhoods && count($neighborhoods) === 0) continue;

                    $areas[] = [
                        "city" => $city,
                        "allNeighborhoods" => $allNeighborhoods,
                        "neighborhoods" => $neighborhoods,
                    ];
                    $selectedItemCount += $allNeighborhoods ? 1 : count($neighborhoods);
                    $citySeen[$city] = true;
                }
            }
        }

        if (!$allCities && count($cities) === 0 && count($areas) === 0) continue;

        $provinceSeen[$province] = true;
        $scopes[] = [
            "province" => $province,
            "allCities" => $allCities,
            "cities" => $cities,
            "areas" => $areas,
        ];
    }

    if (count($scopes) === 0) {
        return [
            "mode" => "all",
            "label" => "سراسر ایران",
            "scopes" => [],
        ];
    }

    $places = [];
    foreach ($scopes as $scope) {
        if ($scope["allCities"]) {
            $places[] = "کل " . $scope["province"];
            continue;
        }

        foreach ($scope["cities"] as $city) {
            $places[] = $city;
        }

        foreach ($scope["areas"] as $area) {
            if ($area["allNeighborhoods"]) {
                $places[] = $area["city"];
                continue;
            }

            foreach ($area["neighborhoods"] as $neighborhood) {
                $places[] = $neighborhood . "، " . $area["city"];
            }
        }
    }

    $label = count($places) <= 2
        ? implode("، ", $places)
        : implode("، ", array_slice($places, 0, 2)) . " +" . (count($places) - 2);

    $first = $scopes[0];
    $mode = count($scopes) > 1 || count($places) > 1
        ? "multi"
        : ($first["allCities"] ? "province" : "cities");

    return [
        "mode" => $mode,
        "label" => $label,
        "scopes" => $scopes,
    ];
}

try {
    $pdo = db();
    $auth = chakod_auth_current($pdo, true);
    $data = chakod_auth_json_body();

    $fullName = chakod_profile_clean_text(
        $data["full_name"] ?? $auth["user"]["full_name"] ?? "",
        120
    );
    $accountType = strtolower(chakod_profile_clean_text(
        $data["account_type"] ?? $auth["user"]["account_type"] ?? "personal",
        20
    ));
    $businessName = chakod_profile_clean_text(
        $data["business_name"] ?? $auth["user"]["business_name"] ?? "",
        180
    );

    $allowedTypes = ["personal", "dealer", "parts_store", "repair_shop"];

    if (!in_array($accountType, $allowedTypes, true)) {
        response_json(["success" => false, "message" => "نوع حساب انتخاب‌شده معتبر نیست."], 422);
    }

    if (chakod_auth_text_length($fullName) < 2) {
        response_json(["success" => false, "message" => "نام و نام خانوادگی را کامل‌تر وارد کنید."], 422);
    }

    if ($accountType !== "personal" && chakod_auth_text_length($businessName) < 2) {
        $nameLabels = [
            "dealer" => "نام نمایشگاه را وارد کنید.",
            "parts_store" => "نام فروشگاه یدکی را وارد کنید.",
            "repair_shop" => "نام تعمیرگاه یا مجموعه را وارد کنید.",
        ];
        response_json([
            "success" => false,
            "message" => $nameLabels[$accountType] ?? "نام مجموعه را وارد کنید."
        ], 422);
    }

    $location = $accountType === "personal"
        ? ["mode" => null, "label" => null, "scopes" => []]
        : chakod_profile_normalize_location($data["business_location_scopes"] ?? []);

    if ($accountType === "personal") {
        $businessName = "";
    }

    $locationJson = $accountType === "personal"
        ? null
        : json_encode($location["scopes"], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    $userId = (int)$auth["user"]["id"];
    $previous = [
        "full_name" => $auth["user"]["full_name"] ?? null,
        "account_type" => $auth["user"]["account_type"] ?? "personal",
        "business_name" => $auth["user"]["business_name"] ?? null,
        "business_location_mode" => $auth["user"]["business_location_mode"] ?? null,
        "business_location_label" => $auth["user"]["business_location_label"] ?? ($auth["user"]["business_city"] ?? null),
    ];
    $currentProfile = [
        "full_name" => $fullName,
        "account_type" => $accountType,
        "business_name" => $businessName !== "" ? $businessName : null,
        "business_location_mode" => $location["mode"],
        "business_location_label" => $location["label"],
    ];
    $changedFields = [];

    foreach ($currentProfile as $field => $value) {
        if (($previous[$field] ?? null) !== $value) $changedFields[] = $field;
    }

    $pdo->beginTransaction();

    $update = $pdo->prepare("
        UPDATE ck_auth_users
        SET
            full_name = ?,
            account_type = ?,
            business_name = ?,
            business_city = ?,
            business_location_mode = ?,
            business_location_label = ?,
            business_location_scopes = ?,
            updated_at = NOW()
        WHERE id = ?
          AND status = 'active'
          AND deleted_at IS NULL
    ");
    $update->execute([
        $fullName,
        $accountType,
        $businessName !== "" ? $businessName : null,
        $location["label"],
        $location["mode"],
        $location["label"],
        $locationJson,
        $userId,
    ]);

    $fresh = $pdo->prepare("SELECT * FROM ck_auth_users WHERE id = ? LIMIT 1");
    $fresh->execute([$userId]);
    $userRow = $fresh->fetch(PDO::FETCH_ASSOC);

    if (!$userRow) throw new RuntimeException("Updated profile user was not found.");

    $pdo->commit();
    $identity = chakod_auth_build_identity($pdo, $userRow);

    chakod_auth_log_event(
        $pdo,
        "profile_update",
        true,
        $userId,
        (string)$userRow["mobile"],
        ["changed_fields" => $changedFields]
    );

    response_json([
        "success" => true,
        "message" => $accountType === "personal"
            ? "اطلاعات اولیه حساب ذخیره شد."
            : "اطلاعات اولیه ثبت شد. در مرحله بعد می‌توانید پروفایل حرفه‌ای مجموعه را کامل کنید.",
        "user" => $identity["user"],
        "roles" => $identity["roles"],
        "primary_role" => $identity["primary_role"],
        "role_title" => $identity["role_title"],
        "permissions" => $identity["permissions"],
        "redirect_to" => $identity["redirect_to"],
        "is_site_owner" => $identity["is_site_owner"],
        "dealers" => $identity["dealers"],
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log("Chakod update-profile error: " . $e->getMessage());
    response_json(["success" => false, "message" => "خطای سرور در ذخیره اطلاعات اولیه."], 500);
}
