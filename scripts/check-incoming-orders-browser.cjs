/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require(process.env.RABT_PLAYWRIGHT_PATH || "@playwright/test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

(async () => {
  const db = JSON.parse(fs.readFileSync(".data/rabt.json", "utf8"));
  const fixture = db.users.filter((user) => user.profile.email.startsWith("qa-inbox-business-")).at(-1);
  assert(fixture, "Run check-incoming-orders.mjs first");
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const base = process.env.RABT_TEST_URL || "http://localhost:3000";
    await page.goto(base + "/login", { waitUntil: "networkidle" });
    await page.getByLabel("البريد الإلكتروني", { exact: true }).fill(fixture.profile.email);
    await page.getByLabel("كلمة المرور", { exact: true }).fill("Rabt-Inbox-82!");
    await page.getByRole("button", { name: "دخول إلى حسابي", exact: true }).click();
    await page.waitForURL("**/account");
    await page.locator(".inbox-summary").filter({ hasText: "عندك 1 طلب جديد" }).waitFor();
    await page.locator(".inbox-link .count-badge").getByText("1", { exact: true }).waitFor();
    await page.locator(".account-sidebar").getByRole("link", { name: "الطلبات الواردة، 1 جديدة", exact: true }).click();
    await page.waitForURL("**/account/orders");
    await page.locator(".incoming-order").waitFor();
    assert.equal(await page.locator(".incoming-order").count(), 1);
    assert((await page.locator(".buyer-contact").innerText()).includes("0781234567"));
    assert((await page.locator(".incoming-items").innerText()).includes("حاسوب اختبار المتجر"));
    assert(!(await page.locator(".incoming-items").innerText()).includes("هاتف اختبار الطلبات الواردة"));
    assert((await page.locator(".incoming-order-bottom").innerText()).includes("90.00"));
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Desktop overflow");
    fs.mkdirSync("output/review", { recursive: true });
    await page.screenshot({ path: "output/review/incoming-orders-desktop.png", fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Mobile overflow");
    await page.screenshot({ path: "output/review/incoming-orders-mobile.png", fullPage: true });
    await page.getByRole("button", { name: "تحديد كمقروء", exact: true }).click();
    await page.locator(".incoming-order").getByText("تم الاطلاع", { exact: true }).waitFor();
    assert.equal(await page.locator(".inbox-link .count-badge").count(), 0);
    await page.reload({ waitUntil: "networkidle" });
    await page.locator(".incoming-order").getByText("تم الاطلاع", { exact: true }).waitFor();
    await page.getByRole("checkbox", { name: "الجديدة فقط", exact: true }).check();
    await page.getByText("كل الطلبات مقروءة", { exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log("PASS: seller login notification, inbox navigation, private line items/contacts, mobile, mark read, persisted badge removal and unread filter.");
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exit(1); });
