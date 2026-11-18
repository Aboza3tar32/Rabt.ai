import assert from "node:assert/strict";

const base = process.env.RABT_TEST_URL || "http://localhost:3000";
function client() {
  let cookie = "";
  return async (resource, method = "GET", body, expected = 200) => {
    const response = await fetch(`${base}/api/${resource}`, {
      method,
      headers: { cookie, origin: base, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const next = response.headers.get("set-cookie");
    if (next) cookie = next.split(";")[0];
    const data = await response.json();
    assert.equal(response.status, expected, `${method} ${resource}: ${JSON.stringify(data)}`);
    return data;
  };
}
const first = client();
const second = client();
const guest = client();
const unique = Date.now();
const email = `qa-${unique}@example.test`;
const profile = { action: "register", type: "individual", fullName: "فحص رابط", email, password: "Test-Rabt-82!", phone: "0791234567", city: "Amman", consent: true };
await first("auth");
await first("auth", "POST", { ...profile, consent: false }, 400);
const registered = await first("auth", "POST", profile);
assert.equal(registered.activeProfile.fullName, profile.fullName);
await second("auth", "POST", { action: "login", email, password: "wrong-password" }, 401);
await second("auth", "POST", { action: "login", email, password: profile.password });
const listing = await first("marketplace", "POST", { title: "منتج اختبار الحفظ", description: "وصف منتج اختبار كامل للتحقق من عمل الخادم", price: 42.5, city: "Amman", category: "phones", condition: "used", kind: "product" });
assert.equal(listing.ownerId, registered.activeProfile.id);
const publicData = await guest("marketplace");
assert(publicData.listings.some((item) => item.id === listing.id));
assert(!JSON.stringify(publicData).includes(email), "Private email leaked in public data");
await guest("marketplace", "PUT", { ...listing, price: 1 }, 401);
await guest("auth", "POST", { action: "demo", type: "individual" });
await guest("marketplace", "PUT", { ...listing, price: 1 }, 403);
const changed = await second("marketplace", "PUT", { ...listing, price: 43 });
assert.equal(changed.price, 43);
await first("preferences", "PUT", { favorites: [listing.id], cart: { [listing.id]: 2 }, compare: [listing.id] });
assert.equal((await first("preferences")).cart[listing.id], 2);
assert.equal((await second("preferences")).cart[listing.id], 2, "Account preferences must persist across sessions");
const order = await first("orders", "POST", { fullName: profile.fullName, email, phone: profile.phone, consent: true, items: [{ id: listing.id, quantity: 2, price: 0.01 }] });
assert.equal(order.total, 86, "Order must use server prices");
assert((await first("orders")).some((item) => item.id === order.id));
assert(!(await guest("orders")).some((item) => item.id === order.id));
const contact = await first("contact", "POST", { name: "اختبار رابط", email, message: "رسالة تحقق من حفظ نموذج التواصل بنجاح.", consent: true });
assert(contact.id);
await first("marketplace?id=" + listing.id, "DELETE");
assert(!(await second("marketplace")).listings.some((item) => item.id === listing.id));
await first("auth", "DELETE");
assert.equal((await first("auth")).activeProfile, null);
for (const route of ["/", "/register", "/orders", "/terms", "/privacy", "/returns", "/contact", "/images/hero.webp", "/images/phone.webp", "/brand-mark.svg"]) {
  assert.equal((await fetch(base + route)).status, 200, route);
}
console.log("PASS: registration, password login, public listings, ownership, edits, preferences, server-priced orders, private history, contact, deletion, logout and page/assets checks.");
