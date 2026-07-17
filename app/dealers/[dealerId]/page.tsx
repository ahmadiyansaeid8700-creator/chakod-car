"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";

const API_BASE = "https://api.chakod.com";

type ApiResult<T = unknown> = {
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
  permissions?: string[];
  dealer?: { id: number; name: string; scope?: string };
};

type Branch = {
  id: number;
  dealer_id: number;
  name: string;
  branch_code?: string | null;
  province?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  address?: string | null;
  phone?: string | null;
  whatsapp_phone?: string | null;
  email?: string | null;
  description?: string | null;
  is_headquarters: boolean;
  is_public: boolean;
  verification_status?: "pending" | "verified" | "rejected";
  status: "draft" | "active" | "disabled" | "archived";
  listing_count: number;
  member_count: number;
};

type Role = {
  code: string;
  title: string;
  permissions: string[];
};

type MemberAssignment = {
  id?: number;
  branch_id: number;
  branch_name?: string;
  role: string;
  role_title?: string;
  status?: string;
  is_primary: boolean;
};

type Member = {
  id: number;
  dealer_id: number;
  auth_user_id?: number | null;
  mobile_masked: string;
  full_name?: string | null;
  phone_verified?: boolean;
  role: string;
  status: "active" | "invited" | "disabled" | "removed";
  assignments: MemberAssignment[];
};

type MembersResponse = ApiResult<Member[]> & {
  available_roles?: Role[];
};

type BranchForm = {
  name: string;
  branch_code: string;
  phone: string;
  whatsapp_phone: string;
  province: string;
  city: string;
  neighborhood: string;
  address: string;
  description: string;
  is_public: boolean;
};

type AssignmentDraft = Record<
  number,
  { selected: boolean; role: string; is_primary: boolean }
>;

const emptyBranchForm: BranchForm = {
  name: "",
  branch_code: "",
  phone: "",
  whatsapp_phone: "",
  province: "",
  city: "",
  neighborhood: "",
  address: "",
  description: "",
  is_public: true,
};

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("chakod_session_token") || "";
}

function normalizeDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function apiHeaders() {
  const token = getToken();
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
          "X-Session-Token": token,
        }
      : {}),
  };
}

async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...apiHeaders(),
      ...(init?.headers || {}),
    },
    credentials: "include",
    cache: "no-store",
  });

  const text = await response.text();
  let json: unknown = {};

  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("پاسخ نامعتبر از سرور دریافت شد.");
  }

  if (!response.ok) {
    const message =
      typeof json === "object" && json !== null && "message" in json
        ? String((json as { message?: unknown }).message || "درخواست انجام نشد.")
        : "درخواست انجام نشد.";
    throw new Error(message);
  }

  return json as T;
}

async function fetchGeo(params?: { province?: string; city?: string }) {
  const search = new URLSearchParams();
  if (params?.province) search.set("province", params.province);
  if (params?.city) search.set("city", params.city);

  const query = search.toString();
  const json = await apiRequest<{
    success: boolean;
    data?: string[];
    has_neighborhoods?: boolean;
  }>(`${API_BASE}/api/geo-locations.php${query ? `?${query}` : ""}`);

  return {
    data: Array.isArray(json.data) ? json.data : [],
    hasNeighborhoods: Boolean(json.has_neighborhoods),
  };
}

function statusTitle(status: Branch["status"]) {
  return {
    draft: "پیش‌نویس",
    active: "فعال",
    disabled: "غیرفعال",
    archived: "بایگانی",
  }[status];
}

function memberStatusTitle(status: Member["status"]) {
  return {
    active: "فعال",
    invited: "دعوت‌شده",
    disabled: "غیرفعال",
    removed: "حذف‌شده",
  }[status];
}

export default function DealerManagementPage() {
  const params = useParams<{ dealerId: string }>();
  const dealerId = Number(Array.isArray(params.dealerId) ? params.dealerId[0] : params.dealerId);

  const [tab, setTab] = useState<"branches" | "members">("branches");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [dealerName, setDealerName] = useState("نمایشگاه");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  const [showBranchForm, setShowBranchForm] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<number | null>(null);
  const [branchForm, setBranchForm] = useState<BranchForm>(emptyBranchForm);
  const [provinces, setProvinces] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [hasNeighborhoods, setHasNeighborhoods] = useState(false);

  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [memberMobile, setMemberMobile] = useState("");
  const [memberStatus, setMemberStatus] = useState<Member["status"]>("active");
  const [assignmentDraft, setAssignmentDraft] = useState<AssignmentDraft>({});

  const canManageBranches = permissions.includes("*") || permissions.includes("dealer.branches.manage");
  const canManageMembers = permissions.includes("*") || permissions.includes("dealer.members.manage");

  const activeBranches = useMemo(
    () => branches.filter((branch) => branch.status !== "archived"),
    [branches]
  );

  async function loadAll() {
    if (!Number.isInteger(dealerId) || dealerId <= 0) {
      setError("شناسه نمایشگاه معتبر نیست.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const branchResult = await apiRequest<ApiResult<Branch[]>>(
        `${API_BASE}/api/dealer-branches.php?dealer_id=${dealerId}`
      );

      if (!branchResult.success) {
        throw new Error(branchResult.message || "شعبه‌ها دریافت نشد.");
      }

      setBranches(Array.isArray(branchResult.data) ? branchResult.data : []);
      setPermissions(Array.isArray(branchResult.permissions) ? branchResult.permissions : []);
      setDealerName(branchResult.dealer?.name || "نمایشگاه");

      const branchPermissions = Array.isArray(branchResult.permissions)
        ? branchResult.permissions
        : [];
      const mayLoadMembers =
        branchPermissions.includes("*") || branchPermissions.includes("dealer.members.manage");

      if (mayLoadMembers) {
        const memberResult = await apiRequest<MembersResponse>(
          `${API_BASE}/api/dealer-members.php?dealer_id=${dealerId}`
        );
        setMembers(Array.isArray(memberResult.data) ? memberResult.data : []);
        setRoles(Array.isArray(memberResult.available_roles) ? memberResult.available_roles : []);
      } else {
        setMembers([]);
        setRoles([]);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "اطلاعات مدیریت نمایشگاه دریافت نشد.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [dealerId]);

  useEffect(() => {
    fetchGeo()
      .then((result) => setProvinces(result.data))
      .catch(() => setProvinces([]));
  }, []);

  useEffect(() => {
    if (!branchForm.province) {
      setCities([]);
      setNeighborhoods([]);
      setHasNeighborhoods(false);
      return;
    }

    setGeoLoading(true);
    fetchGeo({ province: branchForm.province })
      .then((result) => setCities(result.data))
      .catch(() => setCities([]))
      .finally(() => setGeoLoading(false));
  }, [branchForm.province]);

  useEffect(() => {
    if (!branchForm.province || !branchForm.city) {
      setNeighborhoods([]);
      setHasNeighborhoods(false);
      return;
    }

    setGeoLoading(true);
    fetchGeo({ province: branchForm.province, city: branchForm.city })
      .then((result) => {
        setNeighborhoods(result.data);
        setHasNeighborhoods(result.hasNeighborhoods && result.data.length > 0);
      })
      .catch(() => {
        setNeighborhoods([]);
        setHasNeighborhoods(false);
      })
      .finally(() => setGeoLoading(false));
  }, [branchForm.province, branchForm.city]);

  function resetMessages() {
    setMessage("");
    setError("");
  }

  function openNewBranch() {
    resetMessages();
    setEditingBranchId(null);
    setBranchForm(emptyBranchForm);
    setShowBranchForm(true);
  }

  function openEditBranch(branch: Branch) {
    resetMessages();
    setEditingBranchId(branch.id);
    setBranchForm({
      name: branch.name || "",
      branch_code: branch.branch_code || "",
      phone: branch.phone || "",
      whatsapp_phone: branch.whatsapp_phone || "",
      province: branch.province || "",
      city: branch.city || "",
      neighborhood: branch.neighborhood || "",
      address: branch.address || "",
      description: branch.description || "",
      is_public: branch.is_public,
    });
    setShowBranchForm(true);
  }

  async function saveBranch() {
    resetMessages();

    if (branchForm.name.trim().length < 2) {
      setError("نام شعبه را کامل وارد کنید.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        dealer_id: dealerId,
        ...(editingBranchId ? { branch_id: editingBranchId } : {}),
        name: branchForm.name.trim(),
        branch_code: branchForm.branch_code.trim() || null,
        phone: normalizeDigits(branchForm.phone).trim(),
        whatsapp_phone: normalizeDigits(branchForm.whatsapp_phone).trim(),
        province: branchForm.province || null,
        city: branchForm.city || null,
        neighborhood: hasNeighborhoods ? branchForm.neighborhood || null : null,
        address: branchForm.address.trim() || null,
        description: branchForm.description.trim() || null,
        is_public: branchForm.is_public,
      };

      const result = await apiRequest<ApiResult>(`${API_BASE}/api/dealer-branches.php`, {
        method: editingBranchId ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });

      setMessage(result.message || (editingBranchId ? "شعبه ویرایش شد." : "شعبه ساخته شد."));
      setShowBranchForm(false);
      setEditingBranchId(null);
      setBranchForm(emptyBranchForm);
      await loadAll();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ثبت شعبه انجام نشد.");
    } finally {
      setSaving(false);
    }
  }

  async function updateBranchQuick(branch: Branch, changes: Record<string, unknown>) {
    resetMessages();
    setSaving(true);
    try {
      const result = await apiRequest<ApiResult>(`${API_BASE}/api/dealer-branches.php`, {
        method: "PATCH",
        body: JSON.stringify({
          dealer_id: dealerId,
          branch_id: branch.id,
          ...changes,
        }),
      });
      setMessage(result.message || "شعبه به‌روزرسانی شد.");
      await loadAll();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تغییر شعبه انجام نشد.");
    } finally {
      setSaving(false);
    }
  }

  function blankAssignments(): AssignmentDraft {
    const defaultRole = roles[0]?.code || "viewer";
    const result: AssignmentDraft = {};
    activeBranches.forEach((branch, index) => {
      result[branch.id] = {
        selected: index === 0,
        role: defaultRole,
        is_primary: index === 0,
      };
    });
    return result;
  }

  function openNewMember() {
    resetMessages();
    setEditingMember(null);
    setMemberMobile("");
    setMemberStatus("active");
    setAssignmentDraft(blankAssignments());
    setShowMemberForm(true);
  }

  function openEditMember(member: Member) {
    resetMessages();
    const defaultRole = roles[0]?.code || "viewer";
    const draft: AssignmentDraft = {};
    activeBranches.forEach((branch) => {
      const current = member.assignments.find((item) => item.branch_id === branch.id);
      draft[branch.id] = {
        selected: Boolean(current),
        role: current?.role || defaultRole,
        is_primary: Boolean(current?.is_primary),
      };
    });
    setEditingMember(member);
    setMemberMobile("");
    setMemberStatus(member.status);
    setAssignmentDraft(draft);
    setShowMemberForm(true);
  }

  function toggleAssignment(branchId: number, selected: boolean) {
    setAssignmentDraft((current) => {
      const next = { ...current };
      const previous = next[branchId] || {
        selected: false,
        role: roles[0]?.code || "viewer",
        is_primary: false,
      };
      next[branchId] = { ...previous, selected };

      if (!selected && previous.is_primary) {
        next[branchId].is_primary = false;
        const replacement = Object.entries(next).find(([, item]) => item.selected);
        if (replacement) next[Number(replacement[0])].is_primary = true;
      }

      if (selected && !Object.values(next).some((item) => item.selected && item.is_primary)) {
        next[branchId].is_primary = true;
      }

      return next;
    });
  }

  function setPrimaryBranch(branchId: number) {
    setAssignmentDraft((current) => {
      const next: AssignmentDraft = {};
      Object.entries(current).forEach(([key, item]) => {
        const id = Number(key);
        next[id] = {
          ...item,
          is_primary: id === branchId,
          selected: id === branchId ? true : item.selected,
        };
      });
      return next;
    });
  }

  function assignmentPayload() {
    return Object.entries(assignmentDraft)
      .filter(([, item]) => item.selected)
      .map(([branchId, item]) => ({
        branch_id: Number(branchId),
        role: item.role,
        is_primary: item.is_primary,
      }));
  }

  async function saveMember() {
    resetMessages();
    const assignments = assignmentPayload();

    if (!assignments.length) {
      setError("حداقل یک شعبه برای عضو انتخاب کنید.");
      return;
    }

    if (!editingMember && normalizeDigits(memberMobile).trim().length < 10) {
      setError("شماره همراه عضو را کامل وارد کنید.");
      return;
    }

    setSaving(true);
    try {
      const payload = editingMember
        ? {
            dealer_id: dealerId,
            member_id: editingMember.id,
            status: memberStatus,
            assignments,
          }
        : {
            dealer_id: dealerId,
            mobile: normalizeDigits(memberMobile).trim(),
            assignments,
          };

      const result = await apiRequest<ApiResult>(`${API_BASE}/api/dealer-members.php`, {
        method: editingMember ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });

      setMessage(result.message || "اطلاعات عضو ثبت شد.");
      setShowMemberForm(false);
      setEditingMember(null);
      await loadAll();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ثبت عضو انجام نشد.");
    } finally {
      setSaving(false);
    }
  }

  async function changeMemberStatus(member: Member, status: Member["status"]) {
    resetMessages();
    setSaving(true);
    try {
      const result = await apiRequest<ApiResult>(`${API_BASE}/api/dealer-members.php`, {
        method: "PATCH",
        body: JSON.stringify({
          dealer_id: dealerId,
          member_id: member.id,
          status,
        }),
      });
      setMessage(result.message || "وضعیت عضو تغییر کرد.");
      await loadAll();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تغییر وضعیت عضو انجام نشد.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="managementPage" dir="rtl">
      <section className="shell">
        <header className="topbar">
          <Link href="/dealers" className="backLink">بازگشت به نمایشگاه‌ها</Link>
          <Link href="/" className="brand">
            <Image src="/brand/chakod-symbol.png" alt="چاکود" width={46} height={46} priority />
            <div><strong>چاکود</strong><span>مدیریت نمایشگاه</span></div>
          </Link>
        </header>

        <section className="hero">
          <div>
            <span className="eyebrow">ساختار سازمانی نمایشگاه</span>
            <h1>{dealerName}</h1>
            <p>شعبه‌ها، اعضای تیم و سطح دسترسی هر عضو را از یک صفحه مدیریت کنید.</p>
          </div>
          <div className="heroStats">
            <div><strong>{branches.length.toLocaleString("fa-IR")}</strong><span>شعبه</span></div>
            <div><strong>{members.length.toLocaleString("fa-IR")}</strong><span>عضو</span></div>
          </div>
        </section>

        <div className="tabs" role="tablist">
          <button className={tab === "branches" ? "active" : ""} onClick={() => setTab("branches")}>شعبه‌ها</button>
          <button className={tab === "members" ? "active" : ""} onClick={() => setTab("members")}>اعضای تیم</button>
        </div>

        {message && <div className="notice success">{message}</div>}
        {error && <div className="notice error">{error}</div>}

        {loading ? (
          <div className="stateCard"><div className="loader" /><h2>در حال دریافت اطلاعات...</h2></div>
        ) : (
          <>
            {tab === "branches" && (
              <section className="panel">
                <div className="panelHead">
                  <div><span>ساختار شعب</span><h2>شعبه‌های نمایشگاه</h2></div>
                  {canManageBranches && <button className="primaryBtn compact" onClick={openNewBranch}>افزودن شعبه</button>}
                </div>

                {branches.length === 0 ? (
                  <div className="empty">هیچ شعبه‌ای برای این نمایشگاه پیدا نشد.</div>
                ) : (
                  <div className="branchGrid">
                    {branches.map((branch) => (
                      <article className="branchCard" key={branch.id}>
                        <div className="cardTop">
                          <div>
                            <div className="badges">
                              {branch.is_headquarters && <span className="badge primary">شعبه مرکزی</span>}
                              <span className={`badge ${branch.status}`}>{statusTitle(branch.status)}</span>
                              <span className="badge neutral">{branch.is_public ? "عمومی" : "خصوصی"}</span>
                            </div>
                            <h3>{branch.name}</h3>
                            <p>{[branch.province, branch.city, branch.neighborhood].filter(Boolean).join("، ") || "موقعیت ثبت نشده"}</p>
                          </div>
                          <span className="branchId">#{branch.id.toLocaleString("fa-IR")}</span>
                        </div>

                        <div className="metrics">
                          <div><strong>{Number(branch.listing_count || 0).toLocaleString("fa-IR")}</strong><span>آگهی</span></div>
                          <div><strong>{Number(branch.member_count || 0).toLocaleString("fa-IR")}</strong><span>عضو</span></div>
                        </div>

                        {branch.address && <p className="address">{branch.address}</p>}

                        {canManageBranches && (
                          <div className="actions">
                            <button onClick={() => openEditBranch(branch)}>ویرایش</button>
                            <button onClick={() => updateBranchQuick(branch, { is_public: !branch.is_public })} disabled={saving}>
                              {branch.is_public ? "خصوصی‌کردن" : "عمومی‌کردن"}
                            </button>
                            {!branch.is_headquarters && (
                              <button onClick={() => updateBranchQuick(branch, { is_headquarters: true })} disabled={saving}>انتقال مرکز</button>
                            )}
                            {!branch.is_headquarters && (
                              <button
                                className={branch.status === "active" ? "danger" : ""}
                                onClick={() => updateBranchQuick(branch, { status: branch.status === "active" ? "disabled" : "active" })}
                                disabled={saving}
                              >
                                {branch.status === "active" ? "غیرفعال‌کردن" : "فعال‌کردن"}
                              </button>
                            )}
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}

            {tab === "members" && (
              <section className="panel">
                <div className="panelHead">
                  <div><span>تیم نمایشگاه</span><h2>اعضا و دسترسی شعبه‌ها</h2></div>
                  {canManageMembers && <button className="primaryBtn compact" onClick={openNewMember}>دعوت عضو</button>}
                </div>

                {!canManageMembers ? (
                  <div className="empty">حساب شما اجازه مدیریت اعضای این نمایشگاه را ندارد.</div>
                ) : members.length === 0 ? (
                  <div className="empty">هنوز عضوی برای این نمایشگاه ثبت نشده است.</div>
                ) : (
                  <div className="memberList">
                    {members.map((member) => {
                      const isOwner = member.role === "owner";
                      return (
                        <article className="memberCard" key={member.id}>
                          <div className="memberIdentity">
                            <div className="avatar">{(member.full_name || "ع").trim().slice(0, 1)}</div>
                            <div>
                              <div className="badges">
                                {isOwner && <span className="badge primary">مالک</span>}
                                <span className={`badge ${member.status}`}>{memberStatusTitle(member.status)}</span>
                              </div>
                              <h3>{member.full_name || "عضو نمایشگاه"}</h3>
                              <p>{member.mobile_masked || "شماره پنهان"}</p>
                            </div>
                          </div>

                          <div className="assignmentList">
                            {member.assignments.length === 0 ? (
                              <span className="muted">بدون شعبه تخصیص‌یافته</span>
                            ) : (
                              member.assignments.map((assignment) => (
                                <div key={`${member.id}-${assignment.branch_id}`}>
                                  <strong>{assignment.branch_name}</strong>
                                  <span>{assignment.role_title || assignment.role}{assignment.is_primary ? " · شعبه اصلی" : ""}</span>
                                </div>
                              ))
                            )}
                          </div>

                          {!isOwner && (
                            <div className="actions">
                              <button onClick={() => openEditMember(member)}>ویرایش دسترسی</button>
                              <button
                                className={member.status === "active" ? "danger" : ""}
                                onClick={() => changeMemberStatus(member, member.status === "active" ? "disabled" : "active")}
                                disabled={saving}
                              >
                                {member.status === "active" ? "غیرفعال‌کردن" : "فعال‌کردن"}
                              </button>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </section>

      {showBranchForm && (
        <div className="modalBackdrop" onMouseDown={() => !saving && setShowBranchForm(false)}>
          <section className="modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modalHead"><div><span>مدیریت شعبه</span><h2>{editingBranchId ? "ویرایش شعبه" : "افزودن شعبه جدید"}</h2></div><button onClick={() => setShowBranchForm(false)}>×</button></div>
            <div className="formGrid">
              <label className="field full"><span>نام شعبه</span><input value={branchForm.name} onChange={(e) => setBranchForm((v) => ({ ...v, name: e.target.value }))} placeholder="مثلاً شعبه مرکزی تهران" /></label>
              <label className="field"><span>کد داخلی شعبه</span><input value={branchForm.branch_code} onChange={(e) => setBranchForm((v) => ({ ...v, branch_code: e.target.value }))} placeholder="مثلاً THR-01" /></label>
              <label className="field"><span>شماره تماس</span><input value={branchForm.phone} onChange={(e) => setBranchForm((v) => ({ ...v, phone: normalizeDigits(e.target.value) }))} inputMode="tel" /></label>
              <label className="field"><span>شماره واتساپ</span><input value={branchForm.whatsapp_phone} onChange={(e) => setBranchForm((v) => ({ ...v, whatsapp_phone: normalizeDigits(e.target.value) }))} inputMode="tel" /></label>
              <label className="field"><span>استان</span><select value={branchForm.province} onChange={(e) => setBranchForm((v) => ({ ...v, province: e.target.value, city: "", neighborhood: "" }))}><option value="">انتخاب استان</option>{provinces.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="field"><span>شهر</span><select value={branchForm.city} disabled={!branchForm.province || geoLoading} onChange={(e) => setBranchForm((v) => ({ ...v, city: e.target.value, neighborhood: "" }))}><option value="">انتخاب شهر</option>{cities.map((item) => <option key={item}>{item}</option>)}</select></label>
              {hasNeighborhoods && <label className="field"><span>محله</span><select value={branchForm.neighborhood} onChange={(e) => setBranchForm((v) => ({ ...v, neighborhood: e.target.value }))}><option value="">انتخاب محله</option>{neighborhoods.map((item) => <option key={item}>{item}</option>)}</select></label>}
              <label className="field full"><span>آدرس</span><textarea value={branchForm.address} onChange={(e) => setBranchForm((v) => ({ ...v, address: e.target.value }))} /></label>
              <label className="field full"><span>توضیحات شعبه</span><textarea value={branchForm.description} onChange={(e) => setBranchForm((v) => ({ ...v, description: e.target.value }))} /></label>
              <label className="checkField full"><input type="checkbox" checked={branchForm.is_public} onChange={(e) => setBranchForm((v) => ({ ...v, is_public: e.target.checked }))} /><span>این شعبه در صفحه عمومی نمایشگاه نمایش داده شود</span></label>
            </div>
            <div className="modalActions"><button className="secondaryBtn" onClick={() => setShowBranchForm(false)} disabled={saving}>انصراف</button><button className="primaryBtn" onClick={saveBranch} disabled={saving}>{saving ? "در حال ذخیره..." : "ذخیره شعبه"}</button></div>
          </section>
        </div>
      )}

      {showMemberForm && (
        <div className="modalBackdrop" onMouseDown={() => !saving && setShowMemberForm(false)}>
          <section className="modal wide" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modalHead"><div><span>اعضای زیرمجموعه</span><h2>{editingMember ? "ویرایش دسترسی عضو" : "دعوت عضو جدید"}</h2></div><button onClick={() => setShowMemberForm(false)}>×</button></div>
            {!editingMember && <label className="field"><span>شماره همراه تأییدشده یا شماره دعوت</span><input value={memberMobile} onChange={(e) => setMemberMobile(normalizeDigits(e.target.value))} inputMode="tel" placeholder="09xxxxxxxxx" /></label>}
            {editingMember && <label className="field"><span>وضعیت عضو</span><select value={memberStatus} onChange={(e) => setMemberStatus(e.target.value as Member["status"])}><option value="active">فعال</option><option value="invited">دعوت‌شده</option><option value="disabled">غیرفعال</option></select></label>}
            <div className="assignmentEditor">
              <div className="assignmentHead"><strong>شعبه‌ها و نقش عضو</strong><span>حداقل یک شعبه انتخاب شود.</span></div>
              {activeBranches.map((branch) => {
                const draft = assignmentDraft[branch.id] || { selected: false, role: roles[0]?.code || "viewer", is_primary: false };
                return (
                  <div className={`assignmentRow ${draft.selected ? "selected" : ""}`} key={branch.id}>
                    <label className="assignmentCheck"><input type="checkbox" checked={draft.selected} onChange={(e) => toggleAssignment(branch.id, e.target.checked)} /><span><strong>{branch.name}</strong><small>{branch.is_headquarters ? "شعبه مرکزی" : [branch.province, branch.city].filter(Boolean).join("، ")}</small></span></label>
                    <select disabled={!draft.selected} value={draft.role} onChange={(e) => setAssignmentDraft((current) => ({ ...current, [branch.id]: { ...draft, role: e.target.value } }))}>{roles.map((role) => <option key={role.code} value={role.code}>{role.title}</option>)}</select>
                    <label className="primaryChoice"><input type="radio" name="primaryBranch" checked={draft.selected && draft.is_primary} onChange={() => setPrimaryBranch(branch.id)} disabled={!draft.selected} />شعبه اصلی</label>
                  </div>
                );
              })}
            </div>
            <div className="modalActions"><button className="secondaryBtn" onClick={() => setShowMemberForm(false)} disabled={saving}>انصراف</button><button className="primaryBtn" onClick={saveMember} disabled={saving}>{saving ? "در حال ذخیره..." : editingMember ? "ذخیره دسترسی" : "ثبت دعوت"}</button></div>
          </section>
        </div>
      )}

      <style>{`
        *{box-sizing:border-box}body{margin:0;background:#f8f5ff}.managementPage{min-height:100vh;padding:24px 18px 110px;font-family:Tahoma,Arial,sans-serif;color:#25143c;background:radial-gradient(circle at 88% 4%,rgba(124,58,237,.16),transparent 28%),linear-gradient(180deg,#fff 0,#f8f5ff 60%,#fff 100%)}.shell{width:min(1180px,100%);margin:0 auto}.topbar{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:20px}.brand{display:flex;align-items:center;gap:10px;color:inherit;text-decoration:none}.brand img{width:46px;height:46px;object-fit:contain}.brand strong,.brand span{display:block}.brand strong{font-size:18px}.brand span{font-size:12px;color:#7c6a93;margin-top:3px}.backLink{padding:11px 15px;border:1px solid #e5d8fb;background:#fff;border-radius:14px;color:#6d28d9;text-decoration:none;font-weight:800;font-size:13px}.hero,.panel,.stateCard{background:rgba(255,255,255,.94);border:1px solid #eadffd;box-shadow:0 20px 58px rgba(76,29,149,.1);border-radius:30px}.hero{display:flex;justify-content:space-between;align-items:center;gap:24px;padding:30px 34px}.eyebrow,.panelHead>div>span,.modalHead span{display:inline-flex;padding:7px 11px;border-radius:999px;background:#f3eaff;border:1px solid #e4d4ff;color:#6d28d9;font-size:12px;font-weight:900}.hero h1{margin:12px 0 0;font-size:34px}.hero p{margin:10px 0 0;color:#735f8c;line-height:1.9}.heroStats{display:flex;gap:12px}.heroStats div{min-width:100px;padding:18px;border-radius:20px;background:#faf7ff;border:1px solid #eadffd;text-align:center}.heroStats strong,.heroStats span{display:block}.heroStats strong{font-size:25px;color:#6d28d9}.heroStats span{font-size:12px;color:#7d6d90;margin-top:6px}.tabs{display:flex;gap:8px;margin:20px 0}.tabs button{border:1px solid #e5d8fb;background:#fff;color:#6d28d9;border-radius:14px;padding:12px 22px;font:inherit;font-weight:900;cursor:pointer}.tabs button.active{background:#6d28d9;color:#fff;border-color:#6d28d9}.notice{padding:14px 18px;border-radius:16px;margin-bottom:14px;font-size:14px;line-height:1.8}.notice.success{background:#ecfdf3;border:1px solid #b7efcb;color:#156b3a}.notice.error{background:#fff1f2;border:1px solid #fecdd3;color:#a3122d}.panel{padding:28px}.panelHead{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:22px}.panelHead h2,.modalHead h2{margin:10px 0 0;font-size:25px}.primaryBtn,.secondaryBtn,.actions button{border:0;font:inherit;font-weight:900;cursor:pointer}.primaryBtn{min-height:48px;padding:0 22px;border-radius:15px;background:linear-gradient(135deg,#6d28d9,#9333ea);color:#fff}.primaryBtn.compact{min-height:42px}.secondaryBtn{min-height:48px;padding:0 20px;border-radius:15px;background:#f5efff;color:#6d28d9;border:1px solid #e5d8fb}.primaryBtn:disabled,.secondaryBtn:disabled,.actions button:disabled{opacity:.55;cursor:not-allowed}.branchGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.branchCard,.memberCard{border:1px solid #e9def9;background:#fff;border-radius:23px;padding:20px}.cardTop{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.cardTop h3,.memberCard h3{margin:12px 0 6px;font-size:19px}.cardTop p,.memberCard p{margin:0;color:#806f94;font-size:13px}.badges{display:flex;gap:6px;flex-wrap:wrap}.badge{display:inline-flex;padding:5px 8px;border-radius:999px;font-size:10px;font-weight:900}.badge.primary{background:#ede2ff;color:#6d28d9}.badge.active{background:#dcfce7;color:#166534}.badge.disabled,.badge.removed{background:#fee2e2;color:#991b1b}.badge.draft,.badge.invited{background:#fef3c7;color:#92400e}.badge.archived,.badge.neutral{background:#f1f5f9;color:#475569}.branchId{font-size:11px;color:#9a8aa9}.metrics{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:18px 0}.metrics div{padding:12px;border-radius:14px;background:#faf7ff;text-align:center}.metrics strong,.metrics span{display:block}.metrics strong{font-size:18px;color:#6d28d9}.metrics span{font-size:11px;color:#7d6d90;margin-top:4px}.address{font-size:12px;color:#6f607d;line-height:1.8;min-height:22px}.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}.actions button{padding:9px 12px;border-radius:11px;background:#f5efff;color:#6d28d9;border:1px solid #e5d8fb;font-size:11px}.actions button.danger{background:#fff1f2;border-color:#fecdd3;color:#be123c}.memberList{display:grid;gap:12px}.memberCard{display:grid;grid-template-columns:minmax(220px,.9fr) minmax(280px,1.4fr) auto;align-items:center;gap:20px}.memberIdentity{display:flex;align-items:center;gap:12px}.avatar{width:48px;height:48px;border-radius:17px;background:linear-gradient(135deg,#6d28d9,#a855f7);color:#fff;display:grid;place-items:center;font-size:20px;font-weight:900}.assignmentList{display:flex;gap:8px;flex-wrap:wrap}.assignmentList div{padding:9px 11px;background:#faf7ff;border:1px solid #eadffd;border-radius:12px}.assignmentList strong,.assignmentList span{display:block}.assignmentList strong{font-size:12px}.assignmentList span{font-size:10px;color:#7c6a93;margin-top:4px}.muted,.empty{color:#806f94}.empty{padding:30px;text-align:center;border:1px dashed #dfd0f5;border-radius:20px;background:#fcfaff}.stateCard{padding:70px 20px;text-align:center}.loader{width:42px;height:42px;border-radius:50%;border:4px solid #eadffd;border-top-color:#6d28d9;margin:0 auto 16px;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.modalBackdrop{position:fixed;inset:0;z-index:1000;background:rgba(31,16,53,.48);backdrop-filter:blur(7px);display:grid;place-items:center;padding:18px}.modal{width:min(720px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:28px;padding:24px;box-shadow:0 35px 100px rgba(31,16,53,.3)}.modal.wide{width:min(900px,100%)}.modalHead{display:flex;align-items:flex-start;justify-content:space-between;gap:15px;margin-bottom:20px}.modalHead>button{width:38px;height:38px;border:0;border-radius:12px;background:#f4effa;color:#6d28d9;font-size:24px;cursor:pointer}.formGrid{display:grid;grid-template-columns:1fr 1fr;gap:13px}.field{display:grid;gap:7px;margin-bottom:13px}.field.full,.checkField.full{grid-column:1/-1}.field span{font-size:12px;color:#675677;font-weight:800}.field input,.field select,.field textarea,.assignmentRow select{width:100%;border:1px solid #dfd2f3;border-radius:14px;background:#fff;padding:12px 13px;font:inherit;color:#2d1945;outline:none}.field textarea{min-height:90px;resize:vertical}.field input:focus,.field select:focus,.field textarea:focus{border-color:#8b5cf6;box-shadow:0 0 0 3px rgba(139,92,246,.12)}.checkField{display:flex;align-items:center;gap:9px;padding:12px;border-radius:14px;background:#faf7ff;font-size:12px}.modalActions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}.assignmentEditor{border:1px solid #e7daf9;border-radius:20px;overflow:hidden}.assignmentHead{display:flex;justify-content:space-between;gap:12px;padding:15px 17px;background:#faf7ff}.assignmentHead span{font-size:11px;color:#7d6d90}.assignmentRow{display:grid;grid-template-columns:1fr 190px 100px;gap:12px;align-items:center;padding:13px 16px;border-top:1px solid #eee5fa}.assignmentRow.selected{background:#fdfbff}.assignmentCheck{display:flex;align-items:center;gap:10px}.assignmentCheck span,.assignmentCheck strong,.assignmentCheck small{display:block}.assignmentCheck small{color:#806f94;margin-top:4px}.primaryChoice{font-size:11px;display:flex;align-items:center;gap:6px}.assignmentRow select{padding:9px 10px}.assignmentRow select:disabled{opacity:.55}.modal::-webkit-scrollbar{width:8px}.modal::-webkit-scrollbar-thumb{background:#d8c5f5;border-radius:999px}@media(max-width:820px){.managementPage{padding:14px 12px 100px}.topbar{align-items:flex-start}.hero{padding:22px;display:block}.hero h1{font-size:27px}.heroStats{margin-top:18px}.heroStats div{flex:1;min-width:0}.panel{padding:18px}.panelHead{align-items:flex-start}.branchGrid{grid-template-columns:1fr}.memberCard{grid-template-columns:1fr}.formGrid{grid-template-columns:1fr}.field.full,.checkField.full{grid-column:auto}.assignmentRow{grid-template-columns:1fr}.modal{padding:18px;border-radius:22px}.backLink{font-size:11px;padding:9px 11px}.brand span{display:none}}@media(max-width:520px){.heroStats{gap:8px}.panelHead{display:block}.panelHead .primaryBtn{width:100%;margin-top:14px}.actions button{flex:1}.tabs button{flex:1}.modalActions button{flex:1}.assignmentHead{display:block}.assignmentHead span{display:block;margin-top:6px}}
      `}</style>
    </main>
  );
}
