/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require(process.env.RABT_PLAYWRIGHT_PATH || "@playwright/test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const base = process.env.RABT_TEST_URL || "http://localhost:3000";

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(base);
    await page.evaluate(() => localStorage.setItem("rabt-language", "en"));
    await context.request.put(base + "/api/preferences", { data: { favorites: ["iphone-14-used"], cart: { "iphone-14-used": 1 }, compare: ["iphone-14-used", "iphone-15-128"] } });
    const market = await (await context.request.get(base + "/api/marketplace")).json();
    const memberContent = new Set([...market.listings.flatMap((item) => [item.title, item.titleAr, item.titleEn, item.description]), ...market.profiles.flatMap((profile) => [profile.fullName, profile.businessNameAr, profile.businessNameEn, profile.description])].filter(Boolean));
    const failures = [];
    const routes = ["/", "/products", "/products/iphone-14-used", "/used", "/stores", "/stores/pixel-house", "/services", "/services/web-design", "/favorites", "/cart", "/checkout", "/compare", "/about", "/how-it-works", "/contact", "/terms", "/privacy", "/returns", "/login", "/register", "/forgot-password", "/orders"];
    async function inspect(route, navigate = true) {
      if (navigate) await page.goto(base + route, { waitUntil: "networkidle" });
      assert.equal(await page.locator("html").getAttribute("lang"), "en", route);
      assert.equal(await page.locator("html").getAttribute("dir"), "ltr", route);
      const remaining = await page.evaluate(() => {
        const values = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const node = walker.currentNode;
          if (!node.parentElement?.closest("script,style,textarea,.language-button,[data-member-content]")) {
            const value = node.textContent.trim();
            if (/[\u0600-\u06ff]/.test(value) && node.parentElement?.getClientRects().length) values.push(value);
          }
        }
        for (const element of document.querySelectorAll("input[placeholder],textarea[placeholder],[aria-label],[title]")) {
          if (element.closest(".language-button")) continue;
          for (const name of ["placeholder", "aria-label", "title"]) {
            const value = element.getAttribute(name);
            if (value && /[\u0600-\u06ff]/.test(value)) values.push(`${name}: ${value}`);
          }
        }
        return [...new Set(values)];
      });
      const unexpected = remaining.filter((value) => !memberContent.has(value.replace(/^aria-label: /, "")));
      if (unexpected.length) failures.push({ route, remaining: unexpected });
    }
    for (const route of routes) await inspect(route);
    await page.goto(base + "/register", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Individual account", exact: false }).click();
    await inspect("/register", false);
    const account = await (await context.request.post(base + "/api/auth", { data: { action: "demo", type: "business" } })).json();
    for (const route of ["/account", "/account/profile", "/account/listings", "/account/settings", "/account/orders", "/sell", "/orders", "/stores", "/checkout"]) await inspect(route);
    const listing = await (await context.request.post(base + "/api/marketplace", { data: { title: "Locale QA phone", description: "A product created to check the language of incoming orders.", category: "phones", price: 55, city: "Amman", kind: "product", condition: "new" } })).json();
    const buyerContext = await browser.newContext();
    const buyer = await (await buyerContext.request.post(base + "/api/auth", { data: { action: "demo", type: "individual" } })).json();
    await buyerContext.request.post(base + "/api/orders", { data: { fullName: "Locale QA buyer", email: "qa-locale@example.test", phone: "0791234567", consent: true, items: [{ id: listing.id, quantity: 2 }] } });
    await inspect("/account/orders");
    await page.getByText("Locale QA buyer", { exact: false }).waitFor();
    await page.getByRole("button", { name: "Mark as read", exact: true }).waitFor();
    await page.screenshot({ path: "output/review/incoming-orders-english.png", fullPage: true });
    await page.goto(base + "/login", { waitUntil: "networkidle" });
    await page.getByLabel("Email", { exact: true }).fill("unknown-locale-test@example.test");
    await page.getByLabel("Password", { exact: true }).fill("Wrong-password-82!");
    await page.getByRole("button", { name: "Sign in to my account", exact: true }).click();
    await page.locator(".toast").getByText("Incorrect email or password.", { exact: true }).waitFor();
    await page.locator(".language-button").click();
    await page.getByRole("button", { name: "دخول إلى حسابي", exact: true }).click();
    await page.locator(".toast").getByText("البريد الإلكتروني أو كلمة المرور غير صحيحة.", { exact: true }).waitFor();
    await page.locator(".language-button").click();
    await page.goto(base + "/stores", { waitUntil: "networkidle" });
    await page.locator(".language-button").click();
    await page.getByRole("heading", { name: "بيت البكسل", exact: true }).waitFor();
    assert.equal(await page.locator("html").getAttribute("dir"), "rtl");
    await page.reload({ waitUntil: "networkidle" });
    assert.equal(await page.locator("html").getAttribute("lang"), "ar");
    await page.locator(".language-button").click();
    await page.getByRole("heading", { name: "Pixel House", exact: true }).waitFor();
    assert.equal(await page.locator("html").getAttribute("dir"), "ltr");
    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of ["/", "/account/orders", "/terms", "/contact", "/checkout"]) {
      await inspect(route);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `English mobile overflow: ${route}`);
    }
    await page.locator(".language-button").click();
    for (const route of ["/", "/services/web-design", "/products/iphone-14-used", "/terms", "/account/orders"]) {
      await page.goto(base + route, { waitUntil: "networkidle" });
      assert.equal(await page.locator("html").getAttribute("lang"), "ar");
      assert.equal(await page.locator("html").getAttribute("dir"), "rtl");
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Arabic mobile overflow: ${route}`);
    }
    await page.getByRole("button", { name: "تحديد كمقروء", exact: true }).waitFor();
    await context.request.delete(base + "/api/marketplace?id=" + listing.id);
    fs.writeFileSync("output/review/locale-fixtures.json", JSON.stringify([account.activeProfile.id, buyer.activeProfile.id]));
    await buyerContext.close();
    fs.mkdirSync("output/review", { recursive: true });
    fs.writeFileSync("output/review/locale-audit.json", JSON.stringify(failures, null, 2));
    console.log(JSON.stringify(failures));
    assert.deepEqual(errors, []);
    assert.deepEqual(failures, [], "Untranslated Arabic content in English pages");
    console.log("PASS: English content, accessibility labels and LTR across public/account routes.");
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exit(1); });
