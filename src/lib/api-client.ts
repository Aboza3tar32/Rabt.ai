export async function api<T>(resource: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`/api/${resource}`, {
    method, credentials: "same-origin", cache: "no-store", keepalive: resource === "preferences",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch(() => { throw new Error(translateContent(typeof document !== "undefined" && document.documentElement.lang === "en" ? "en" : "ar", "تعذر الاتصال بالخادم. أعد تحميل الصفحة.")); });
  const value = await response.json();
  if (!response.ok) throw new Error(translateContent(typeof document !== "undefined" && document.documentElement.lang === "en" ? "en" : "ar", value.error || "تعذر إتمام العملية. حاول مجددًا."));
  return value as T;
}
import { translateContent } from "@/i18n/content";

