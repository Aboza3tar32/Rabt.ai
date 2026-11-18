import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { transaction, type Database, type Preferences } from "@/lib/server-store";
import { cities, products } from "@/data/marketplace";
import type { DemoProfile } from "@/types/demo-auth";
import type { LocalListing } from "@/types/marketplace";
import type { OrderItem, IncomingOrder } from "@/types/orders";

export const runtime = "nodejs";
const COOKIE = "rabt-session";
const emptyPreferences = (): Preferences => ({ favorites: [], cart: {}, compare: [] });
class HttpError extends Error { constructor(message: string, public status = 400) { super(message); } }
const fail = (message: string, status = 400): never => { throw new HttpError(message, status); };
function field(value: unknown, min = 1, max = 250): string {
  if (typeof value !== "string" || value.trim().length < min || value.length > max) return fail("يرجى التحقق من البيانات المدخلة.");
  return value.trim();
}
function email(value: unknown) { const result = field(value, 5, 200).toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) fail("البريد الإلكتروني غير صالح."); return result; }
function phone(value: unknown) { const result = field(value, 9, 25); if (!/^(?:\+962|00962|0)7[789]\d{7}$/.test(result.replace(/[\s-]/g, ""))) fail("أدخل رقم هاتف أردني صالحًا مثل 0791234567."); return result; }
function profile(input: Record<string, unknown>, id: string, type: "individual" | "business", createdAt: string): DemoProfile {
  const city = field(input.city); if (!cities.includes(city)) fail("اختر مدينة من القائمة.");
  const avatar = typeof input.avatar === "string" && /^data:image\/(png|jpeg|webp|gif);base64,[a-zA-Z0-9+/=]+$/.test(input.avatar) && input.avatar.length < 1_400_000 ? input.avatar : undefined;
  const common = { id, type, createdAt, city, email: email(input.email), phone: phone(input.phone), avatar };
  return type === "individual" ? { ...common, type, fullName: field(input.fullName, 2, 80) } : {
    ...common, type, businessNameAr: field(input.businessNameAr, 2, 100), businessNameEn: field(input.businessNameEn, 2, 100),
    address: field(input.address, 3, 300), category: field(input.category), description: field(input.description, 10, 2000),
  };
}
function hashPassword(password: string, salt = randomBytes(16).toString("hex")) { return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`; }
function validPassword(password: string, saved: string) { const [salt, hash] = saved.split(":"); if (!salt || !hash) return false; const actual = Buffer.from(hashPassword(password, salt).split(":")[1], "hex"); const expected = Buffer.from(hash, "hex"); return actual.length === expected.length && timingSafeEqual(actual, expected); }
const publicProfiles = (db: Database) => db.users.map(({ profile: p }) => p.type === "individual"
  ? { id: p.id, type: p.type, fullName: p.fullName, city: p.city, createdAt: p.createdAt }
  : { id: p.id, type: p.type, businessNameAr: p.businessNameAr, businessNameEn: p.businessNameEn, city: p.city, description: p.description, category: p.category, createdAt: p.createdAt, address: "", email: "", phone: "" });

async function handle(request: NextRequest, context: { params: Promise<{ resource: string }> }) {
  const { resource } = await context.params;
  if (!["auth", "marketplace", "preferences", "orders", "incoming-orders", "contact"].includes(resource)) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  if (request.method !== "GET" && request.headers.get("origin") && request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "طلب غير مسموح" }, { status: 403 });
  let input: Record<string, unknown> = {};
  try {
    if (request.method !== "GET" && request.method !== "DELETE") {
      const raw = await request.text(); if (raw.length > 2_000_000) fail("حجم الطلب كبير جدًا.", 413);
      try { input = JSON.parse(raw); } catch { fail("صيغة الطلب غير صالحة."); }
      if (!input || Array.isArray(input) || typeof input !== "object") fail("صيغة الطلب غير صالحة.");
    }
    let token = request.cookies.get(COOKIE)?.value ?? randomBytes(32).toString("hex");
    const hash = createHash("sha256").update(token).digest("hex");
    const payload = await transaction(async (db) => {
      let session = db.sessions.find((item) => item.hash === hash);
      if (!session) { session = { hash, ownerId: null, expires: Date.now() + 30 * 86400000, preferences: emptyPreferences() }; db.sessions.push(session); }
      const user = db.users.find((item) => item.profile.id === session.ownerId);
      const requireUser = () => user ?? fail("سجّل الدخول لإتمام هذه العملية.", 401);
      function throttle(key: string, limit: number) {
        const entry = db.attempts[key] ?? { count: 0, reset: Date.now() + 15 * 60000 };
        entry.count++; db.attempts[key] = entry;
        if (entry.count > limit) return false;
        return true;
      }
      if (resource === "auth") {
        if (request.method === "GET") return { activeProfile: user?.profile ?? null, profiles: publicProfiles(db) };
        if (request.method === "DELETE") { db.sessions = db.sessions.filter((item) => item.hash !== hash); return { ok: true }; }
        if (request.method === "PATCH") {
          const account = requireUser(); const next = profile(input, account.profile.id, account.profile.type, account.profile.createdAt);
          if (db.users.some((item) => item !== account && item.profile.email === next.email)) fail("البريد مستخدم بالفعل.", 409);
          account.profile = next; return { activeProfile: next, profiles: publicProfiles(db) };
        }
        if (request.method !== "POST") fail("طريقة غير مدعومة.", 405);
        const action = input.action;
        const loginEmail = action === "demo" ? "demo" : email(input.email);
        if (!throttle(`auth:${loginEmail}`, 15)) return { error: "محاولات كثيرة. حاول بعد 15 دقيقة.", status: 429 };
        if (action === "login") {
          const account = db.users.find((item) => item.profile.email === loginEmail && !item.demo);
          const password = field(input.password, 1, 128);
          if (!account || !validPassword(password, account.passwordHash)) return { error: "البريد الإلكتروني أو كلمة المرور غير صحيحة.", status: 401 };
          // Rotate the session after login; restore saved account preferences.
          session.ownerId = account.profile.id;
          session.preferences = account.preferences ?? session.preferences;
        } else if (action === "register" || action === "demo") {
          const type = input.type === "business" ? "business" : "individual";
          const id = randomUUID();
          if (action === "register" && input.consent !== true) fail("الموافقة على الشروط وسياسة الخصوصية مطلوبة.");
          const draft = action === "demo" ? {
            email: `demo-${id}@example.test`, phone: "0790000000", city: "Amman", fullName: "رنا الخطيب",
            businessNameAr: "متجر زيتون للتقنية", businessNameEn: "Zaytoun Tech", address: "عمّان", category: "electronics", description: "متجر عربي تجريبي لاستكشاف تجربة رابط.",
          } : input;
          const next = profile(draft, id, type, new Date().toISOString());
          if (db.users.some((item) => item.profile.email === next.email)) fail("البريد مستخدم بالفعل.", 409);
          const password = action === "demo" ? randomBytes(32).toString("hex") : field(input.password, 8, 128);
          db.users.push({ profile: next, passwordHash: hashPassword(password), consentAt: new Date().toISOString(), demo: action === "demo" });
          session.ownerId = id;
        } else fail("طلب غير صالح.");
        token = randomBytes(32).toString("hex");
        session.hash = createHash("sha256").update(token).digest("hex");
        return { activeProfile: db.users.find((item) => item.profile.id === session.ownerId)!.profile, profiles: publicProfiles(db) };
      }
      if (resource === "preferences") {
        if (request.method === "GET") return user?.preferences ?? session.preferences;
        if (request.method !== "PUT") fail("طريقة غير مدعومة.", 405);
        const ids = new Set([...products.map((p) => p.id), ...db.listings.map((p) => p.id)]);
        const list = (v: unknown, max: number) => Array.isArray(v) ? [...new Set(v.filter((id): id is string => typeof id === "string" && ids.has(id)))].slice(0, max) : [];
        session.preferences = { favorites: list(input.favorites, 200), compare: list(input.compare, 3), cart: Object.fromEntries(Object.entries(input.cart && typeof input.cart === "object" ? input.cart : {}).filter(([id, q]) => ids.has(id) && Number.isInteger(q) && Number(q) > 0 && Number(q) <= 99).slice(0, 100)) };
        if (user) user.preferences = session.preferences;
        return session.preferences;
      }
      if (resource === "marketplace") {
        if (request.method === "GET") return { listings: db.listings, profiles: publicProfiles(db) };
        const account = requireUser();
        if (request.method === "DELETE") {
          const id = request.nextUrl.searchParams.get("id");
          const listing = db.listings.find((item) => item.id === id);
          if (!listing || listing.ownerId !== account.profile.id) fail("الإعلان غير موجود أو ليس لديك صلاحية.", 403);
          db.listings = db.listings.filter((item) => item.id !== id); return { ok: true };
        }
        if (!["POST", "PUT"].includes(request.method)) fail("طريقة غير مدعومة.", 405);
        const existing = db.listings.find((item) => item.id === input.id);
        if (request.method === "PUT" && (!existing || existing.ownerId !== account.profile.id)) fail("ليس لديك صلاحية تعديل الإعلان.", 403);
        const kind = input.kind === "service" ? "service" : "product";
        const categories = kind === "product" ? ["phones", "laptops", "accessories", "audio", "computers", "gaming"] : ["website", "mobile", "design", "support", "integration", "ecommerce", "consulting", "review", "automation", "custom"];
        const category = field(input.category); if (!categories.includes(category)) fail("تصنيف غير صالح.");
        const price = Number(input.price); if (!Number.isFinite(price) || price < 1 || price > 1000000) fail("السعر غير صالح.");
        const city = field(input.city); if (!cities.includes(city)) fail("اختر مدينة صحيحة.");
        const title = field(input.title, 3, 150);
        const image = typeof input.image === "string" && /^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(input.image) && input.image.length < 1_400_000 ? input.image : existing?.image;
        const listing: LocalListing = { id: existing?.id ?? randomUUID(), ownerId: account.profile.id, title, titleAr: title, titleEn: title, description: field(input.description, 10, 5000), category, price, city, condition: input.condition === "used" ? "used" : "new", sellerType: account.profile.type === "business" ? "store" : "individual", kind, createdAt: existing?.createdAt ?? new Date().toISOString(), delivery: kind === "service" ? field(input.delivery, 1, 100) : undefined, image };
        if (existing) db.listings = db.listings.map((item) => item.id === listing.id ? listing : item); else { if (db.listings.filter((l) => l.ownerId === account.profile.id).length >= 100) fail("وصلت إلى الحد الأقصى للإعلانات."); db.listings.unshift(listing); }
        return listing;
      }
      if (resource === "incoming-orders") {
        const sellerId = requireUser().profile.id;
        // Legacy orders can be matched while the original listing still exists.
        const belongsToSeller = (item: OrderItem) => (item.sellerId ?? db.listings.find((listing) => listing.id === item.id)?.ownerId) === sellerId;
        if (request.method === "PATCH") {
          const order = db.orders.find((order) => order.id === input.id && order.items.some(belongsToSeller));
          if (!order) return fail("الطلب غير موجود.", 404);
          order.sellerReadAt = { ...order.sellerReadAt, [sellerId]: order.sellerReadAt?.[sellerId] ?? new Date().toISOString() };
        } else if (request.method !== "GET") return fail("طريقة غير مدعومة.", 405);
        const orders: IncomingOrder[] = db.orders.flatMap((order) => {
          const items = order.items.filter(belongsToSeller);
          if (!items.length) return [];
          // Never return another seller's lines, full basket total or buyer's account ID.
          return [{ id: order.id, fullName: order.fullName, email: order.email, phone: order.phone,
            items, total: Math.round(items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100) / 100,
            createdAt: order.createdAt, readAt: order.sellerReadAt?.[sellerId] ?? null }];
        });
        return { orders, unreadCount: orders.filter((order) => !order.readAt).length };
      }
      if (resource === "orders") {
        const account = requireUser();
        if (request.method === "GET") return db.orders.filter((item) => item.ownerId === account.profile.id);
        if (request.method !== "POST") fail("طريقة غير مدعومة.", 405);
        if (input.consent !== true) fail("الموافقة على الشروط مطلوبة.");
        if (!throttle(`orders:${account.profile.id}`, 15)) return { error: "محاولات كثيرة. حاول لاحقًا.", status: 429 };
        if (!Array.isArray(input.items) || input.items.length === 0 || input.items.length > 100) fail("السلة فارغة أو غير صالحة.");
        const items = (input.items as { id: string; quantity: number }[]).map((item: { id: string; quantity: number }) => {
          if (!item || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) return fail("كمية غير صالحة.");
          const p = products.find((p) => p.id === item.id); const listing = db.listings.find((l) => l.id === item.id && l.kind === "product");
          if (!p && !listing) return fail("أحد المنتجات لم يعد متاحًا.");
          return { id: item.id, quantity: item.quantity, title: p?.nameAr ?? listing!.title, titleEn: p?.nameEn ?? listing?.titleEn, price: p?.priceJod ?? listing!.price, sellerId: p?.sellerId ?? listing!.ownerId };
        });
        const order = { id: `RBT-${randomBytes(5).toString("hex").toUpperCase()}`, ownerId: account.profile.id, fullName: field(input.fullName, 2, 100), email: email(input.email), phone: phone(input.phone), items, total: Math.round(items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100) / 100, status: "pending" as const, createdAt: new Date().toISOString() };
        db.orders.unshift(order); return order;
      }
      if (resource === "contact" && request.method === "POST") {
        if (input.consent !== true) fail("الموافقة على سياسة الخصوصية مطلوبة.");
        if (!throttle(`contact:${hash}`, 5)) return { error: "وصلت إلى حد الرسائل. حاول لاحقًا.", status: 429 };
        const message = { id: randomUUID(), name: field(input.name, 2, 100), email: email(input.email), message: field(input.message, 10, 5000), createdAt: new Date().toISOString() };
        db.messages.unshift(message); return { id: message.id };
      }
      return fail("طريقة غير مدعومة.", 405);
    });
    const response = NextResponse.json(payload, { status: "error" in payload ? Number(payload.status) || 400 : 200, headers: { "Cache-Control": "no-store" } });
    if (resource === "auth" && request.method === "DELETE") response.cookies.delete(COOKIE);
    else response.cookies.set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: request.nextUrl.protocol === "https:", path: "/", maxAge: 30 * 86400 });
    return response;
  } catch (error) {
    if (!(error instanceof HttpError)) console.error("RABT API:", error);
    return NextResponse.json({ error: error instanceof HttpError ? error.message : "تعذر حفظ البيانات. حاول مجددًا." }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
