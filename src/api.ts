import { create } from "zustand";
export type Row = Record<string, any>;
export type Page = {
  items: Row[];
  total: number;
  page: number;
  page_size: number;
};
export type Admin = {
  id: string;
  display_name: string;
  login_name: string;
  role: string;
  permissions: string[];
  mfa_enabled: boolean;
  environment?: string;
};
export const useSession = create<{
  token: string;
  admin: Admin | null;
  set: (token: string, admin: Admin) => void;
  clear: () => void;
}>((set) => ({
  token: "",
  admin: null,
  set: (token, admin) => set({ token, admin }),
  clear: () => set({ token: "", admin: null }),
}));
export function can(permission: string) {
  const p = useSession.getState().admin?.permissions || [];
  return p.includes("*") || p.includes(permission);
}
export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public requestId: string,
  ) {
    super(message);
  }
}
export async function api<T = Row>(
  path: string,
  method = "GET",
  body?: unknown,
  key?: string,
): Promise<T> {
  const token = useSession.getState().token;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Request-ID": crypto.randomUUID(),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (method !== "GET") headers["Idempotency-Key"] = key || crypto.randomUUID();
  let response: Response;
  try {
    response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL || ""}/api/v1/admin${path}`,
      {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: "no-store",
      },
    );
  } catch {
    throw new ApiError(
      "无法连接服务，请检查后端服务后重试",
      "NETWORK_ERROR",
      "",
    );
  }
  let result: Row;
  try {
    result = await response.json();
  } catch {
    throw new ApiError(
      "服务返回异常，请稍后重试",
      "INVALID_RESPONSE",
      response.headers.get("X-Request-ID") || "",
    );
  }
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith("/auth/login"))
      useSession.getState().clear();
    throw new ApiError(
      result.message || "请求失败",
      result.code,
      result.request_id,
    );
  }
  return result.data as T;
}
export const money = (value = 0) =>
  new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" }).format(
    value / 100,
  );
export const dateTime = (value?: string) =>
  value ? new Date(value).toLocaleString("zh-CN", { hour12: false }) : "—";
export const shortId = (value?: string) =>
  value ? value.slice(0, 8).toUpperCase() : "—";
export const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "超级管理员",
  OPERATIONS: "运营管理员",
  SUPPORT: "客服人员",
  QUALITY: "质检专员",
  FINANCE: "财务人员",
  AUDITOR: "审计安全",
};
