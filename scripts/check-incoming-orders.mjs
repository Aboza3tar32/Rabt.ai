import assert from "node:assert/strict";

const base = process.env.RABT_TEST_URL || "http://localhost:3000";
const stamp = Date.now();
function client() {
  let cookie = "";
  return async (resource, method = "GET", body, expected = 200) => {
    const response = await fetch(`${base}/api/${resource}`, { method, headers: { cookie, origin: base, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    if (response.headers.get("set-cookie")) cookie = response.headers.get("set-cookie").split(";")[0];
    const data = await response.json();
    assert.equal(response.status, expected, `${method} ${resource}: ${JSON.stringify(data)}`);
    return data;
  };
}
async function account(label, type = "individual") {
  const call = client();
  const email = `qa-inbox-${label}-${stamp}@example.test`;
  const result = await call("auth", "POST", { action: "register", type, email, password: "Rabt-Inbox-82!", fullName: `فحص ${label}`, phone: "0791234567", city: "Amman", consent: true, businessNameAr: "متجر فحص الوارد", businessNameEn: "Inbox QA Store", category: "electronics", address: "Amman", description: "متجر لاختبار وصول الطلبات وحماية معلومات العملاء." });
  return { call, id: result.activeProfile.id, email };
}
const buyer = await account("buyer");
const individual = await account("individual");
const business = await account("business", "business");
const outsider = await account("outsider");
await client()("incoming-orders", "GET", undefined, 401);
const draft = { title: "هاتف اختبار الطلبات الواردة", description: "منتج تجريبي لاختبار فصل الطلبات حسب البائع.", price: 24, city: "Amman", category: "phones", condition: "new", kind: "product" };
const first = await individual.call("marketplace", "POST", draft);
const second = await business.call("marketplace", "POST", { ...draft, title: "حاسوب اختبار المتجر", price: 90 });
const order = await buyer.call("orders", "POST", { fullName: "المشتري الاختباري", email: buyer.email, phone: "0781234567", consent: true, items: [{ id: first.id, quantity: 2, sellerId: outsider.id }, { id: second.id, quantity: 1, sellerId: outsider.id }] });
assert.equal(order.total, 138);
const one = await individual.call("incoming-orders");
const two = await business.call("incoming-orders");
assert.equal(one.unreadCount, 1);
assert.equal(two.unreadCount, 1);
assert.equal(one.orders[0].fullName, "المشتري الاختباري");
assert.equal(one.orders[0].email, buyer.email);
assert.equal(one.orders[0].phone, "0781234567");
assert.equal(one.orders[0].total, 48);
assert.equal(two.orders[0].total, 90);
assert.deepEqual(one.orders[0].items.map((i) => i.id), [first.id]);
assert.deepEqual(two.orders[0].items.map((i) => i.id), [second.id]);
assert(!("ownerId" in one.orders[0]));
assert.equal((await outsider.call("incoming-orders")).orders.length, 0);
assert.equal((await buyer.call("incoming-orders")).orders.length, 0);
await outsider.call("incoming-orders", "PATCH", { id: order.id }, 404);
assert.equal((await individual.call("incoming-orders", "PATCH", { id: order.id })).unreadCount, 0);
assert.equal((await business.call("incoming-orders")).unreadCount, 1);
const readAt = (await individual.call("incoming-orders")).orders[0].readAt;
assert(readAt);
assert.equal((await individual.call("incoming-orders", "PATCH", { id: order.id })).orders[0].readAt, readAt);
await individual.call(`marketplace?id=${first.id}`, "DELETE");
await business.call(`marketplace?id=${second.id}`, "DELETE");
await individual.call("auth", "DELETE");
await individual.call("auth", "POST", { action: "login", email: individual.email, password: "Rabt-Inbox-82!" });
assert.equal((await individual.call("incoming-orders")).orders[0].items[0].id, first.id, "Order survives listing deletion and a new login");
assert.equal((await individual.call("incoming-orders")).unreadCount, 0);
assert.equal((await buyer.call("orders"))[0].items.length, 2);
assert.equal((await fetch(base + "/account/orders")).status, 200);
console.log("PASS: individual/store inboxes, buyer contacts, split totals, seller snapshots, unread counts, private access, read isolation, persistence after deletion/login and inbox route.");
