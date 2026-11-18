"use client";

import { useText } from "@/i18n/use-text";

import { Children, cloneElement, isValidElement, useEffect, useId, useMemo, useState, type FormEvent, type ReactElement, type ReactNode } from "react";
import Link from "next/link";
import { translateContent } from "@/i18n/content";
import { IncomingOrdersLink } from "@/components/incoming-orders";
import { Checkout, Community, ContactForm, LegalPage, Orders, ThemeToggle } from "@/components/site-extras";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowDownUp, ArrowLeft, ArrowRight, ArrowUpRight, BatteryCharging, BriefcaseBusiness,
  Check, CheckCircle2, Code2, Globe2, HardDrive, Headphones, Heart, Laptop,
  Languages, LayoutGrid, MapPin, Menu, MessageCircle, Minus, Monitor, Mouse, Package,
  Plug, Plus, Search, ShieldCheck, ShoppingBag, ShoppingCart, SlidersHorizontal, Smartphone,
  Sparkles, Store as StoreIcon, Tablet, Trash2, UserRound, X, Keyboard, Gamepad2,
  type LucideIcon,
} from "lucide-react";
import { cities, individualSellers, products as seedProducts, stores } from "@/data/marketplace";
import { categoryName, translate } from "@/i18n/translations";
import { useMarketplace } from "@/contexts/marketplace-context";
import { useDemoAuth } from "@/contexts/demo-auth-context";
import { profileDisplayName, type DemoProfile } from "@/types/demo-auth";
import type { Language, LocalListing, Product } from "@/types/marketplace";
import { AccountAccessPage, AccountPage as AccountDashboardPage } from "@/components/account-pages";

type PageKey = "home" | "products" | "used" | "product" | "stores" | "store" | "services" | "service" | "sell" | "favorites" | "cart" | "checkout" | "account" | "account-profile" | "account-listings" | "account-settings" | "account-orders" | "login" | "register" | "forgot-password" | "about" | "contact" | "how" | "compare" | "terms" | "privacy" | "returns" | "orders";

const iconByName: Record<string, LucideIcon> = {
  smartphone: Smartphone, laptop: Laptop, keyboard: Keyboard, mouse: Mouse, plug: Plug,
  battery: BatteryCharging, headphones: Headphones, monitor: Monitor, "hard-drive": HardDrive,
  gamepad: Gamepad2, tablet: Tablet, package: Package,
};
const cityLabels: Record<string, string> = {
  Amman: "عمّان", Irbid: "إربد", Zarqa: "الزرقاء", Aqaba: "العقبة", Salt: "السلط", Madaba: "مادبا",
};
const money = (value: number, language: Language) =>
  `${value.toLocaleString(language === "ar" ? "ar-JO" : "en-JO")} ${language === "ar" ? "د.أ" : "JOD"}`;

function cityName(city: string, language: Language) {
  return language === "ar" ? cityLabels[city] ?? city : city;
}

function specificationName(name: string, language: Language) {
  if (language === "en") return name;
  const arabic: Record<string, string> = {
    Storage: "السعة التخزينية", Display: "الشاشة", Network: "الشبكة", Battery: "البطارية",
    Condition: "الحالة", Processor: "المعالج", Memory: "الذاكرة", Graphics: "معالج الرسومات",
    Layout: "التخطيط", Connection: "الاتصال", Switches: "المفاتيح", DPI: "الدقة",
    Finish: "التشطيب", Protection: "الحماية", Material: "المادة", Output: "القدرة",
    Ports: "المنافذ", Standard: "المعيار", Capacity: "السعة", "Noise control": "التحكم بالضوضاء",
    Drivers: "وحدات الصوت", Microphone: "الميكروفون", Resolution: "الدقة",
    "Refresh rate": "معدل التحديث", Panel: "نوع اللوحة", Interface: "الواجهة",
    "Read speed": "سرعة القراءة", Features: "الميزات", Compatibility: "التوافق",
    Listing: "الإعلان",
  };
  return arabic[name] ?? name;
}

function ProductArtwork({ product, large = false }: { product: Product; large?: boolean }) {
  const { language } = useMarketplace();
  const lt = useText();
  const Icon = iconByName[product.icon] ?? Package;
  return (
    <div className={`artwork${large ? " large" : ""}`} style={{ "--art-bg": product.accent } as React.CSSProperties} aria-label={language === "ar" ? product.nameAr : product.nameEn}>
      {product.image || ["smartphone", "laptop", "headphones"].includes(product.icon) ? <Image className="product-photo" src={product.image || `/images/${product.icon === "smartphone" ? "phone" : product.icon === "laptop" ? "laptop" : "headphones"}.webp`} alt={language === "ar" ? product.nameAr : product.nameEn} width={large ? 800 : 420} height={large ? 800 : 420} unoptimized /> : <Icon className="artwork-icon" size={large ? 98 : 58} strokeWidth={1.15} aria-hidden="true" />}
      {!product.image && <span className="image-caption">{lt("صورة توضيحية")}</span>}
    </div>
  );
}

function Brand() {
  const lt = useText();
  return (
    <Link href="/" className="brand" aria-label={lt("RABT.AI home")} dir="ltr">
      <Image className="brand-symbol" src="/brand-mark.svg" width={42} height={42} alt="" />
      <span className="brand-wordmark"><span className="brand-name">RABT<span>.AI</span></span><small>{lt("رابط يجمعنا")}</small></span>
    </Link>
  );
}

function Header({ page }: { page: PageKey }) {
  const lt = useText();
  const { language, setLanguage, favorites, cart, notify } = useMarketplace();
  const { activeProfile, logout } = useDemoAuth();
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const links: { href: string; key: Parameters<typeof translate>[1]; pages: PageKey[] }[] = [
    { href: "/", key: "home", pages: ["home"] },
    { href: "/products", key: "products", pages: ["products", "product"] },
    { href: "/stores", key: "stores", pages: ["stores", "store"] },
    { href: "/used", key: "used", pages: ["used"] },
    { href: "/services", key: "services", pages: ["services", "service"] },
    { href: "/sell", key: "sell", pages: ["sell"] },
  ];
  function submitSearch(event: FormEvent) {
    event.preventDefault();
    router.push(`/products${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ""}`);
    setMobileOpen(false);
  }
  function switchLanguage() {
    setLanguage(language === "ar" ? "en" : "ar");
    notify(language === "ar" ? "Interface language: English" : lt("لغة الواجهة: العربية"));
  }
  function signOut() {
    logout();
    setAccountMenuOpen(false);
    setMobileOpen(false);
    notify(t("logout"));
    router.push("/");
  }
  const accountName = activeProfile ? profileDisplayName(activeProfile, language) : "";
  return (
    <>
      <header className="site-header">
        <div className="container topline">
          <Brand />
          <nav className="desktop-nav" aria-label={language === "ar" ? lt("التنقل الرئيسي") : "Main navigation"}>
            {links.map((link) => <Link key={link.href} href={link.href} className={`nav-link${link.pages.includes(page) ? " active" : ""}`}>{t(link.key)}</Link>)}
          </nav>
          <form className="header-search" onSubmit={submitSearch} role="search">
            <input aria-label={t("search")} placeholder={t("search")} value={search} onChange={(event) => setSearch(event.target.value)} />
            <Search size={17} aria-hidden="true" />
          </form>
          <div className="header-actions"><ThemeToggle />{activeProfile && <IncomingOrdersLink compact />}
            <Link href="/favorites" className="icon-button" aria-label={t("favorites")}><Heart size={19} /><span className="count-badge">{favorites.length}</span></Link>
            <Link href="/cart" className="icon-button" aria-label={t("cart")}><ShoppingCart size={19} /><span className="count-badge">{Object.values(cart).reduce((sum, quantity) => sum + quantity, 0)}</span></Link>
            {activeProfile ? <div className="account-menu-wrap"><button type="button" className="account-trigger" aria-expanded={accountMenuOpen} aria-haspopup="menu" onClick={() => setAccountMenuOpen((open) => !open)}><span className="account-avatar">{activeProfile.avatar ? <Image src={activeProfile.avatar} alt="" width={32} height={32} unoptimized /> : accountName.slice(0, 1)}</span><span className="account-trigger-name">{accountName}</span></button>{accountMenuOpen && <div className="account-dropdown" role="menu"><IncomingOrdersLink /><Link href="/account" role="menuitem" onClick={() => setAccountMenuOpen(false)}>{t("dashboard")}</Link><Link href="/orders" role="menuitem" onClick={() => setAccountMenuOpen(false)}>{lt("طلباتي")}</Link><Link href="/account/listings" role="menuitem" onClick={() => setAccountMenuOpen(false)}>{t("listings")}</Link><Link href="/account/profile" role="menuitem" onClick={() => setAccountMenuOpen(false)}>{t("profileSettings")}</Link><button type="button" role="menuitem" onClick={signOut}>{t("logout")}</button></div>}</div> : <div className="auth-header-actions"><Link href="/login" className="button secondary small">{t("logIn")}</Link><Link href="/register" className="button small">{t("register")}</Link></div>}
            <button type="button" className="language-button" onClick={switchLanguage} aria-label={language === "ar" ? "Switch to English" : lt("التبديل إلى العربية")}><Languages size={15} />{t("language")}</button>
            <button type="button" className="icon-button mobile-toggle" aria-label={mobileOpen ? lt("Close menu") : t("menu")} aria-expanded={mobileOpen} onClick={() => setMobileOpen((open) => !open)}>{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button>
          </div>
        </div>
        {mobileOpen && <nav className="mobile-nav" aria-label={t("menu")}><form className="mobile-search" onSubmit={submitSearch} role="search"><input aria-label={t("search")} className="field" placeholder={t("search")} value={search} onChange={(event) => setSearch(event.target.value)} /><button className="button small" type="submit"><Search size={15} />{t("browseProducts")}</button></form>{links.map((link) => <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}>{t(link.key)}</Link>)}{activeProfile ? <><IncomingOrdersLink /><Link href="/account" onClick={() => setMobileOpen(false)}>{t("dashboard")}</Link><Link href="/account/listings" onClick={() => setMobileOpen(false)}>{t("listings")}</Link><Link href="/account/profile" onClick={() => setMobileOpen(false)}>{t("profileSettings")}</Link><button type="button" className="mobile-logout" onClick={signOut}>{t("logout")}</button></> : <div className="mobile-auth-actions"><Link href="/login" className="button secondary small" onClick={() => setMobileOpen(false)}>{t("logIn")}</Link><Link href="/register" className="button small" onClick={() => setMobileOpen(false)}>{t("register")}</Link></div>}</nav>}
      </header>
      <div className="demo-strip"><div className="container"><ShieldCheck size={14} aria-hidden="true" />{t("demo")}</div></div>
    </>
  );
}

function Footer() {
  const lt = useText();
  const { language } = useMarketplace();
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const links = [["/products", "products"], ["/stores", "stores"], ["/services", "services"], ["/account", "account"], ["/about", "aboutTitle"], ["/how-it-works", "howTitle"], ["/contact", "contactTitle"]] as const;
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div><Brand /><p>{t("footerAbout")}</p></div>
          <div><h3>{t("footerLinks")}</h3><div className="footer-links">{links.slice(0, 3).map(([href, key]) => <Link key={href} href={href}>{t(key)}</Link>)}</div></div>
          <div><h3>{t("footerLinks")}</h3><div className="footer-links">{links.slice(3).map(([href, key]) => <Link key={href} href={href}>{t(key)}</Link>)}</div></div>
        </div>
        <div className="footer-bottom"><span>{t("rights")}</span><div className="footer-legal-links"><Link href="/terms">{lt("الشروط والأحكام")}</Link><Link href="/privacy">{lt("الخصوصية")}</Link><Link href="/returns">{lt("الإرجاع والضمان")}</Link><Link href="/orders">{lt("طلباتي")}</Link></div></div>
      </div>
    </footer>
  );
}

function ProductCard({ product }: { product: Product }) {
  const { language, favorites, toggleFavorite, addToCart, compare, toggleCompare, notify } = useMarketplace();
  const { profiles } = useDemoAuth();
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const store = stores.find((item) => item.id === product.sellerId);
  const profile = profiles.find((item) => item.id === product.sellerId);
  const seller = profile ? profileDisplayName(profile, language) : store?.name ?? individualSellers.find((item) => item.id === product.sellerId)?.name ?? t("localProvider");
  const isFavorite = favorites.includes(product.id);
  const isCompared = compare.includes(product.id);
  return (
    <article className="product-card">
      <div className="relative">
        <Link href={`/products/${product.id}`} aria-label={language === "ar" ? product.nameAr : product.nameEn}><ProductArtwork product={product} /></Link>
        <div className="product-badges">
          <span className={`badge${product.condition === "used" ? " condition-used" : ""}`}>{product.condition === "used" ? t("usedBadge") : t("new")}</span>
          {product.sellerType === "individual" && <span className="badge">{t("individual")}</span>}
        </div>
        <button type="button" className={`icon-button favorite-float${isFavorite ? " selected" : ""}`} aria-label={isFavorite ? t("removeFavorite") : t("addFavorite")} aria-pressed={isFavorite} onClick={() => { toggleFavorite(product.id); notify(isFavorite ? t("removeFavorite") : t("addFavorite")); }}><Heart size={17} fill={isFavorite ? "currentColor" : "none"} /></button>
      </div>
      <div className="product-info">
        <span className="product-category">{categoryName(product.category, language)}</span>
        <Link className="product-name" href={`/products/${product.id}`}>{language === "ar" ? product.nameAr : product.nameEn}</Link>
        <span className="seller-line"><MapPin size={13} />{cityName(product.city, language)}<span aria-hidden="true">·</span><StoreIcon size={13} />{profile?.type === "business" ? <Link className="seller-profile-link" href={`/stores/${profile.id}`}>{translateContent(language, seller)}</Link> : translateContent(language, seller)}</span>
        <div className="product-bottom">
          <span className="price">{money(product.priceJod, language)}</span>
          <div className="card-actions">
            <button type="button" className={`small-action${isCompared ? " selected" : ""}`} aria-label={t("compareProducts")} aria-pressed={isCompared} onClick={() => { if (!toggleCompare(product.id)) notify(t("selectionLimit")); }}><ArrowDownUp size={15} /></button>
            <button type="button" className="small-action" aria-label={t("addCart")} onClick={() => { addToCart(product.id); notify(t("addCart")); }}><ShoppingBag size={15} /></button>
          </div>
        </div>
      </div>
    </article>
  );
}

function ProductGrid({ items }: { items: Product[] }) {
  const { language } = useMarketplace();
  return items.length ? <div className="product-grid">{items.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <EmptyState title={translate(language, "noResults")} text={translate(language, "noResultsText")} href="/products" action={translate(language, "browseProducts")} />;
}

function EmptyState({ title, text, href, action }: { title: string; text: string; href: string; action?: string }) {
  return <div className="empty-state"><div className="empty-icon"><ShoppingBag size={24} /></div><h2>{title}</h2><p>{text}</p>{action && <Link className="button secondary" href={href}>{action}</Link>}</div>;
}

function SectionHeading({ title, subtitle, href }: { title: string; subtitle?: string; href?: string }) {
  const { language } = useMarketplace();
  return <div className="section-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{href && <Link className="text-link" href={href}>{translate(language, "viewAll")} {language === "ar" ? <ArrowLeft size={15} /> : <ArrowRight size={15} />}</Link>}</div>;
}

function StoreCard({ storeId }: { storeId: string }) {
  const { language, allProducts } = useMarketplace();
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const store = stores.find((item) => item.id === storeId);
  if (!store) return null;
  const count = allProducts.filter((product) => product.sellerId === store.id).length;
  return <article className="store-card"><span className="store-avatar">{store.mark}</span><h3>{translateContent(language, store.name)}</h3><p>{language === "ar" ? store.descriptionAr : store.descriptionEn}</p><div className="store-meta"><MapPin size={13} />{cityName(store.city, language)}<span>·</span>{count} {t("productCount")}</div><Link href={`/stores/${store.id}`} className="text-link">{t("viewStore")} <ArrowUpRight size={14} /></Link></article>;
}

function BusinessStoreCard({ profileId }: { profileId: string }) {
  const { language, allProducts } = useMarketplace();
  const { profiles } = useDemoAuth();
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const profile = profiles.find((item) => item.id === profileId);
  if (!profile || profile.type !== "business") return null;
  const count = allProducts.filter((product) => product.sellerId === profile.id).length;
  return <article className="store-card"><span className="store-avatar">{profile.avatar ? <Image src={profile.avatar} alt="" width={48} height={48} unoptimized /> : profile.businessNameEn.slice(0, 2).toUpperCase()}</span><h3>{profileDisplayName(profile, language)}</h3><p>{translateContent(language, profile.description)}</p><div className="store-meta"><MapPin size={13} />{cityName(profile.city, language)}<span>·</span>{count} {t("productCount")}</div><Link href={`/stores/${profile.id}`} className="text-link">{t("viewStore")} <ArrowUpRight size={14} /></Link></article>;
}

function ServiceCard({ serviceId }: { serviceId: string }) {
  const { language, allServices } = useMarketplace();
  const { profiles } = useDemoAuth();
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const service = allServices.find((item) => item.id === serviceId);
  if (!service) return null;
  const providerProfile = profiles.find((profile) => profile.id === service.providerId);
  const providerName = providerProfile ? profileDisplayName(providerProfile, language) : service.provider;
  return <article className="service-card"><div className="service-top"><span className="service-icon"><Code2 size={20} /></span><span className="badge">{categoryName(service.category, language)}</span></div><h3>{language === "ar" ? service.titleAr : service.titleEn}</h3><p>{language === "ar" ? service.descriptionAr : service.descriptionEn}</p><div className="service-price">{t("startingAt")} {money(service.price, language)}<small> · {translateContent(language, providerName)}</small></div><Link className="text-link" href={`/services/${service.id}`}>{t("details")} <ArrowUpRight size={14} /></Link></article>;
}

export default function MarketplacePage({ page, id }: { page: PageKey; id?: string }) {
  const lt = useText();
  const { toast, allProducts, favorites, cart, setQuantity, removeFromCart, compare, clearCompare, listings } = useMarketplace();
  return (
    <>
      <Header page={page} />
      <main className="container page-main">
        {page === "home" && <HomePage />}
        {(page === "products" || page === "used") && <CatalogPage usedOnly={page === "used"} />}
        {page === "product" && <ProductDetails id={id ?? ""} />}
        {page === "stores" && <StoresPage />}
        {page === "store" && <StoreDetails id={id ?? ""} />}
        {page === "services" && <ServicesPage />}
        {page === "service" && <ServiceDetails id={id ?? ""} />}
        {page === "sell" && <ListingForm />}
        {page === "favorites" && <FavoritesPage products={allProducts.filter((item) => favorites.includes(item.id))} />}
        {page === "cart" && <CartPage products={allProducts} cart={cart} setQuantity={setQuantity} removeFromCart={removeFromCart} />}
        {page === "checkout" && <Checkout products={allProducts} cart={cart} />}
        {(page === "account" || page === "account-profile" || page === "account-listings" || page === "account-settings" || page === "account-orders") && <AccountDashboardPage page={page} />}
        {(page === "login" || page === "register" || page === "forgot-password") && <AccountAccessPage page={page} />}
        {page === "about" && <AboutPage />}
        {page === "contact" && <ContactForm />}
        {page === "how" && <HowPage />}
        {(page === "terms" || page === "privacy" || page === "returns") && <LegalPage kind={page} />}
        {page === "orders" && <Orders />}
        {page === "compare" && <ComparePage items={allProducts.filter((product) => compare.includes(product.id))} clearCompare={clearCompare} />}
      </main>
      <Footer />
      {toast && <div className="toast" role="status" aria-live="polite"><CheckCircle2 size={17} style={{ verticalAlign: "middle", marginInlineEnd: 8 }} />{" "}{lt(toast)}</div>}
      {listings.length > 0 && <span className="sr-only" aria-live="polite">{listings.length} {lt("saved listings")}</span>}
    </>
  );
}

function HomePage() {
  const lt = useText();
  const { language, allProducts, allServices } = useMarketplace();
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const router = useRouter();
  const [search, setSearch] = useState("");
  const categories: { key: string; icon: LucideIcon; count: string }[] = [
    { key: "phones", icon: Smartphone, count: "04" }, { key: "laptops", icon: Laptop, count: "03" },
    { key: "accessories", icon: Keyboard, count: "05" }, { key: "audio", icon: Headphones, count: "02" },
    { key: "computers", icon: Monitor, count: "03" }, { key: "gaming", icon: Gamepad2, count: "01" },
  ];
  function submit(event: FormEvent) {
    event.preventDefault();
    router.push(`/products${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ""}`);
  }
  return <>
    <section className="hero"><div className="hero-editorial"><Image src="/images/hero.webp" alt={lt("أجهزة تقنية مختارة بتصميم زيتوني")} width={900} height={600} priority /><span className="editorial-note"><span className="live-dot" />{" "}{lt("THE NEXT CONNECTION")}{" "}<span>{lt("اختيارك القادم، أقرب.")}</span></span></div>
      <div className="hero-content">
        <span className="eyebrow"><Sparkles size={15} />{t("heroEyebrow")}</span>
        <h1>{t("heroTitle")}<br /><span>{t("heroAccent")}</span></h1>
        <p>{t("heroText")}</p>
        <form className="hero-search" onSubmit={submit} role="search"><input aria-label={t("search")} placeholder={t("search")} value={search} onChange={(event) => setSearch(event.target.value)} /><button className="button" type="submit"><Search size={16} />{t("browseProducts")}</button></form>
        <div className="hero-stats"><span><strong>{allProducts.length}</strong> {t("products")}</span><span><strong>{allServices.length}</strong> {t("services")}</span><span><MapPin size={14} /><strong>{language === "ar" ? lt("صُنع للأردن") : "Made for Jordan"}</strong></span></div>
      </div>
    </section>
    <section className="section"><SectionHeading title={t("categories")} /><div className="category-grid">{categories.map(({ key, icon: Icon, count }) => <Link href={`/products?category=${key}`} key={key} className="category-card"><span className="category-icon"><Icon size={20} /></span><strong>{t(key as Parameters<typeof translate>[1])}</strong><small>{count} {t("product")}</small></Link>)}</div></section>
    <section className="section"><SectionHeading title={t("featured")} subtitle={language === "ar" ? lt("تفاصيل بتفرق. اختيارات بتشبهك.") : "Thoughtful technology. Your next connection."} href="/products" /><ProductGrid items={allProducts.filter((product) => product.featured).slice(0, 4)} /></section>
    <section className="section"><SectionHeading title={language === "ar" ? lt("وصل حديثًا إلى رابط") : "Fresh on RABT"} href="/products" /><ProductGrid items={[...allProducts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4)} /></section>
    <section className="section"><SectionHeading title={t("usedTitle")} href="/used" /><ProductGrid items={allProducts.filter((product) => product.condition === "used").slice(0, 4)} /></section>
    <section className="section"><SectionHeading title={t("storesTitle")} href="/stores" /><div className="store-grid">{stores.slice(0, 5).map((store) => <StoreCard key={store.id} storeId={store.id} />)}</div></section>
    <section className="section"><SectionHeading title={t("servicesTitle")} href="/services" /><div className="service-grid">{allServices.slice(0, 3).map((service) => <ServiceCard key={service.id} serviceId={service.id} />)}</div></section>
    <Community />
    <section className="section feature-band"><div><span className="eyebrow"><ShieldCheck size={15} />RABT.AI</span><h2 style={{ margin: "12px 0 0", fontSize: 24 }}>{t("why")}</h2><p>{t("whyText")}</p></div><div className="benefits">{[["qualityOne", "qualityOneText", Search], ["qualityTwo", "qualityTwoText", ArrowDownUp], ["qualityThree", "qualityThreeText", ShieldCheck]].map(([title, text, Icon]) => { const BenefitIcon = Icon as LucideIcon; return <div className="benefit" key={title as string}><BenefitIcon className="benefit-icon" size={20} /><h3>{t(title as Parameters<typeof translate>[1])}</h3><p>{t(text as Parameters<typeof translate>[1])}</p></div>; })}</div></section>
    <section className="section"><SectionHeading title={t("how")} /><div className="steps-grid">{[["01", "browse", "browseText"], ["02", "compare", "compareText"], ["03", "connect", "connectText"]].map(([number, title, text]) => <div className="step-card" key={number}><span className="step-number">{number}</span><h3>{t(title as Parameters<typeof translate>[1])}</h3><p>{t(text as Parameters<typeof translate>[1])}</p></div>)}</div></section>
  </>;
}

function CatalogPage({ usedOnly }: { usedOnly: boolean }) {
  const lt = useText();
  const { language, allProducts } = useMarketplace();
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState(usedOnly ? "used" : "");
  const [seller, setSeller] = useState("");
  const [city, setCity] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [sort, setSort] = useState("newest");
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const params = new URLSearchParams(window.location.search);
      setQuery(params.get("search") ?? "");
      setCategory(params.get("category") ?? "");
      setSeller(params.get("seller") ?? "");
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  const filtered = useMemo(() => {
    const words = query.trim().toLocaleLowerCase();
    return allProducts.filter((product) => {
      const searchText = `${product.nameAr} ${product.nameEn} ${product.descriptionAr} ${product.descriptionEn} ${product.category} ${product.city} ${individualSellers.find((person) => person.id === product.sellerId)?.name ?? ""} ${translateContent("en", individualSellers.find((person) => person.id === product.sellerId)?.name ?? "")} ${stores.find((store) => store.id === product.sellerId)?.name ?? ""} ${translateContent("en", stores.find((store) => store.id === product.sellerId)?.name ?? "")} ${categoryName(product.category, "ar")} ${categoryName(product.category, "en")}`.toLocaleLowerCase();
      return (!words || searchText.includes(words)) &&
        (!category || product.category === category) &&
        (!condition || product.condition === condition) &&
        (!seller || product.sellerType === seller) &&
        (!city || product.city === city) &&
        (!min || product.priceJod >= Number(min)) &&
        (!max || product.priceJod <= Number(max)) &&
        (!usedOnly || product.condition === "used");
    }).sort((a, b) => sort === "low" ? a.priceJod - b.priceJod : sort === "high" ? b.priceJod - a.priceJod : b.createdAt.localeCompare(a.createdAt));
  }, [allProducts, query, category, condition, seller, city, min, max, sort, usedOnly]);
  function clear() { setQuery(""); setCategory(""); setCondition(usedOnly ? "used" : ""); setSeller(""); setCity(""); setMin(""); setMax(""); setSort("newest"); }
  const categoryKeys = ["phones", "laptops", "accessories", "audio", "computers", "gaming"];
  return <>
    <div className="page-heading"><span className="eyebrow"><LayoutGrid size={15} />{usedOnly ? t("used") : t("products")}</span><h1 className="page-title">{usedOnly ? t("usedTitle") : t("browseProducts")}</h1><p className="page-intro">{t("demo")}</p></div>
    <div className="catalog-layout">
      <aside className="filter-panel"><div className="filter-title"><span><SlidersHorizontal size={16} style={{ verticalAlign: "middle", marginInlineEnd: 7 }} />{t("filter")}</span><button type="button" className="button ghost small" onClick={clear}>{t("clearFilters")}</button></div><div className="filter-options">
        <div className="filter-field"><label htmlFor="catalog-search">{t("search")}</label><input id="catalog-search" className="field" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("search")} /></div>
        <div className="filter-field"><label htmlFor="category">{t("category")}</label><select id="category" className="select" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">{t("allCategories")}</option>{categoryKeys.map((key) => <option key={key} value={key}>{categoryName(key, language)}</option>)}</select></div>
        <div className="filter-field"><label htmlFor="condition">{t("condition")}</label><select id="condition" className="select" value={condition} onChange={(event) => setCondition(event.target.value)} disabled={usedOnly}><option value="">{t("allConditions")}</option><option value="new">{t("new")}</option><option value="used">{t("usedBadge")}</option></select></div>
        <div className="filter-field"><label htmlFor="seller">{t("sellerType")}</label><select id="seller" className="select" value={seller} onChange={(event) => setSeller(event.target.value)}><option value="">{t("allSellers")}</option><option value="store">{t("store")}</option><option value="individual">{t("individual")}</option></select></div>
        <div className="filter-field"><label htmlFor="city">{t("city")}</label><select id="city" className="select" value={city} onChange={(event) => setCity(event.target.value)}><option value="">{t("allCities")}</option>{cities.map((item) => <option key={item} value={item}>{cityName(item, language)}</option>)}</select></div>
        <div className="filter-field"><label>{t("price")}</label><div className="price-inputs"><input aria-label={t("minPrice")} className="field" type="number" min="0" placeholder={t("minPrice")} value={min} onChange={(event) => setMin(event.target.value)} /><input aria-label={t("maxPrice")} className="field" type="number" min="0" placeholder={t("maxPrice")} value={max} onChange={(event) => setMax(event.target.value)} /></div></div>
      </div></aside>
      <section><div className="catalog-toolbar"><span><strong>{filtered.length}</strong> {t("results")}</span><select className="select" aria-label={t("sortBy")} value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">{t("newest")}</option><option value="low">{t("priceLow")}</option><option value="high">{t("priceHigh")}</option></select></div><ProductGrid items={filtered} />{filtered.length > 0 && <div className="comparison-box"><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><span><strong>{t("compareProducts")}</strong> · {t("comparisonLimit")}</span><Link href="/compare" className="button small">{t("compareProducts")} <ArrowUpRight size={14} /></Link></div><p style={{ margin: "7px 0 0", color: "#64748b", fontSize: 11 }}>{language === "ar" ? lt("استخدم أيقونة المقارنة على بطاقة المنتج لإضافته.") : "Use the compare icon on a product card to add it."}</p></div>}</section>
    </div>
  </>;
}

function ProductDetails({ id }: { id: string }) {
  const lt = useText();
  const { language, allProducts, addToCart, favorites, toggleFavorite, compare, toggleCompare, notify } = useMarketplace();
  const { profiles } = useDemoAuth();
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const [gallery, setGallery] = useState(0);
  const product = allProducts.find((item) => item.id === id);
  if (!product) return <div className="page-heading"><EmptyState title={t("noResults")} text={t("noResultsText")} href="/products" action={t("browseProducts")} /></div>;
  const store = stores.find((item) => item.id === product.sellerId);
  const person = individualSellers.find((item) => item.id === product.sellerId);
  const profile = profiles.find((item) => item.id === product.sellerId);
  const sellerName = profile ? profileDisplayName(profile, language) : store?.name ?? person?.name ?? translate(language, "localProvider");
  const similar = allProducts.filter((item) => item.category === product.category && item.id !== product.id).slice(0, 4);
  const sameModel = allProducts.filter((item) => item.modelId === product.modelId && item.id !== product.id);
  const isFavorite = favorites.includes(product.id);
  const compareSelected = compare.includes(product.id);
  const detailTitle = language === "ar" ? product.nameAr : product.nameEn;
  return <>
    <div className="page-heading"><Link className="text-link" href="/products">{language === "ar" ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}{t("browseProducts")}</Link></div>
    <div className="detail-layout">
      <div><ProductArtwork product={{ ...product, accent: gallery % 2 ? "#e0f2fe" : product.accent }} large /><div style={{ display: "flex", gap: 9, marginTop: 12 }}>{[0, 1, 2].map((index) => <button key={index} type="button" onClick={() => setGallery(index)} aria-label={`${t("product")} ${index + 1}`} className={`small-action${gallery === index ? " selected" : ""}`} style={{ width: 52, height: 45, borderRadius: 10 }}><span style={{ display: "block", width: 22, height: 22, borderRadius: 7, background: [product.accent, "#e0f2fe", "#f0fdfa"][index] }} /></button>)}</div></div>
      <div className="detail-info"><div className="product-badges" style={{ position: "static", marginBottom: 13 }}><span className={`badge${product.condition === "used" ? " condition-used" : ""}`}>{product.condition === "used" ? t("usedBadge") : t("new")}</span><span className="badge">{categoryName(product.category, language)}</span></div><h1>{detailTitle}</h1><span className="seller-line"><MapPin size={14} />{cityName(product.city, language)}</span><div className="detail-price">{money(product.priceJod, language)}</div><p className="detail-description">{language === "ar" ? product.descriptionAr : product.descriptionEn}</p><div className="detail-actions"><button type="button" className="button" onClick={() => { addToCart(product.id); notify(t("addCart")); }}><ShoppingCart size={16} />{t("addCart")}</button><button type="button" className="button secondary" onClick={() => { toggleFavorite(product.id); notify(isFavorite ? t("removeFavorite") : t("addFavorite")); }}><Heart size={16} fill={isFavorite ? "currentColor" : "none"} />{isFavorite ? t("removeFavorite") : t("addFavorite")}</button><button type="button" className={`button secondary${compareSelected ? " selected" : ""}`} onClick={() => { if (!toggleCompare(product.id)) notify(t("selectionLimit")); }}><ArrowDownUp size={16} />{t("compareProducts")}</button></div>
        <div className="seller-panel"><div className="seller-heading"><span className="store-avatar">{profile?.avatar ? <Image src={profile.avatar} alt="" width={42} height={42} unoptimized /> : store?.mark ?? translateContent(language, sellerName).slice(0, 2).toUpperCase()}</span><div><strong>{translateContent(language, sellerName)}</strong><small>{product.sellerType === "store" ? t("store") : t("individual")} · {cityName(product.city, language)}</small></div></div>{profile?.type === "business" && <Link className="text-link" style={{ marginTop: 12 }} href={`/stores/${profile.id}`}>{t("publicStore")} <ArrowUpRight size={14} /></Link>}<button type="button" className="button secondary small" style={{ marginTop: 14 }} onClick={() => notify(t("contactNotice"))}><MessageCircle size={14} />{t("contactSeller")}</button><p className="form-hint" style={{ marginBottom: 0 }}>{t("contactNotice")}</p></div>
        <h2 style={{ margin: "24px 0 0", fontSize: 18 }}>{t("specifications")}</h2><table className="spec-table"><tbody>{Object.entries(product.specifications).map(([key, value]) => <tr key={key}><th>{specificationName(key, language)}</th><td>{translateContent(language, value)}</td></tr>)}</tbody></table>
        {sameModel.length > 0 && <div className="comparison-box"><strong>{language === "ar" ? lt("مقارنة أسعار توضيحية للموديل") : "Illustrative price comparison for this model"}</strong>{sameModel.map((item) => <p key={item.id} style={{ margin: "9px 0 0", fontSize: 12 }}>{item.priceJod < product.priceJod ? "↓" : "↑"} {money(item.priceJod, language)} · {translateContent(language, stores.find((storeItem) => storeItem.id === item.sellerId)?.name ?? (language === "ar" ? lt("بائع فردي") : "Individual seller"))}</p>)}<small className="form-hint">{t("demo")}</small></div>}
      </div>
    </div>
    <section className="section"><SectionHeading title={t("similar")} /><ProductGrid items={similar} /></section>
  </>;
}

function StoresPage() {
  const { language } = useMarketplace();
  const { profiles } = useDemoAuth();
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  return <><div className="page-heading"><span className="eyebrow"><StoreIcon size={15} />{t("stores")}</span><h1 className="page-title">{t("storesTitle")}</h1><p className="page-intro">{t("storesPageText")}</p></div><div className="store-grid">{stores.map((store) => <StoreCard key={store.id} storeId={store.id} />)}{profiles.filter((profile) => profile.type === "business").map((profile) => <BusinessStoreCard key={profile.id} profileId={profile.id} />)}</div></>;
}

function StoreDetails({ id }: { id: string }) {
  const { language, allProducts, notify } = useMarketplace();
  const { profiles } = useDemoAuth();
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const store = stores.find((item) => item.id === id);
  const business = profiles.find((profile): profile is Extract<DemoProfile, { type: "business" }> => profile.id === id && profile.type === "business");
  const [sort, setSort] = useState("newest");
  const [category, setCategory] = useState("");
  if (!store && !business) return <div className="page-heading"><EmptyState title={t("noResults")} text={t("storesPageText")} href="/stores" action={t("stores")} /></div>;
  const storeId = business?.id ?? store!.id;
  const storeName = business ? profileDisplayName(business, language) : store!.name;
  const storeCity = business?.city ?? store!.city;
  const storeDescription = business?.description ?? (language === "ar" ? store!.descriptionAr : store!.descriptionEn);
  const storeMark = store?.mark ?? (business ? business.businessNameEn.slice(0, 2).toUpperCase() : "");
  const storeProducts = allProducts.filter((product) => product.sellerId === storeId);
  const categories = [...new Set(storeProducts.map((product) => product.category))];
  const items = storeProducts.filter((product) => !category || product.category === category).sort((a, b) => sort === "low" ? a.priceJod - b.priceJod : b.createdAt.localeCompare(a.createdAt));
  return <><div className="page-heading"><Link className="text-link" href="/stores">{language === "ar" ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}{t("stores")}</Link></div><div className="content-card" style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}><span className="store-avatar" style={{ width: 68, height: 68, fontSize: 18 }}>{business?.avatar ? <Image src={business.avatar} alt="" width={68} height={68} unoptimized /> : storeMark}</span><div style={{ flex: 1 }}><h1 className="page-title">{translateContent(language, storeName)}</h1><p className="page-intro">{translateContent(language, storeDescription)}</p><span className="seller-line"><MapPin size={13} />{cityName(storeCity, language)}{business ? ` · ${business.address}` : ` · ${t("demo")}`}</span></div>{business && <span className="badge">{t("publicStore")}</span>}<button className="button secondary" type="button" onClick={() => notify(t("contactNotice"))}><MessageCircle size={15} />{t("demoContact")}</button></div><div className="catalog-toolbar" style={{ marginTop: 25 }}><span><strong>{items.length}</strong> {t("results")}</span><div style={{ display: "flex", gap: 8 }}><select className="select" value={category} onChange={(event) => setCategory(event.target.value)} aria-label={t("category")}><option value="">{t("allCategories")}</option>{categories.map((value) => <option key={value} value={value}>{categoryName(value, language)}</option>)}</select><select className="select" style={{ width: 190 }} value={sort} onChange={(event) => setSort(event.target.value)} aria-label={t("sortBy")}><option value="newest">{t("newest")}</option><option value="low">{t("priceLow")}</option><option value="high">{t("priceHigh")}</option></select></div></div><ProductGrid items={items} /></>;
}

function ServicesPage() {
  const { language, allServices } = useMarketplace();
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  return <><div className="page-heading"><span className="eyebrow"><BriefcaseBusiness size={15} />{t("services")}</span><h1 className="page-title">{t("servicesTitle")}</h1><p className="page-intro">{t("servicesPageText")}</p></div><div className="service-grid">{allServices.map((service) => <ServiceCard key={service.id} serviceId={service.id} />)}</div></>;
}

function ServiceDetails({ id }: { id: string }) {
  const lt = useText();
  const { language, notify, allServices } = useMarketplace();
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const service = allServices.find((item) => item.id === id);
  if (!service) return <div className="page-heading"><EmptyState title={t("noResults")} text={t("servicesPageText")} href="/services" action={t("services")} /></div>;
  return <><div className="page-heading"><Link className="text-link" href="/services">{language === "ar" ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}{t("services")}</Link></div><div className="detail-layout"><div className="content-card" style={{ minHeight: 340, display: "grid", placeItems: "center", background: "#f0fdfa" }}><div style={{ textAlign: "center" }}><span className="service-icon" style={{ width: 76, height: 76, margin: "auto" }}><Code2 size={34} /></span><p style={{ color: "#64748b", fontWeight: 700 }}>{categoryName(service.category, language)}</p></div></div><div className="detail-info"><span className="eyebrow">{categoryName(service.category, language)}</span><h1>{language === "ar" ? service.titleAr : service.titleEn}</h1><p className="detail-description">{language === "ar" ? service.descriptionAr : service.descriptionEn}</p><div className="detail-price">{t("startingAt")} {money(service.price, language)}</div><div className="seller-panel"><strong>{t("provider")}</strong><p style={{ margin: "6px 0", color: "#64748b" }}>{translateContent(language, service.provider)}</p><strong>{t("delivery")}</strong><p style={{ margin: "6px 0", color: "#64748b" }}>{translateContent(language, service.delivery)}</p></div><h2 style={{ fontSize: 18 }}>{t("deliverables")}</h2><ul className="detail-description" style={{ paddingInlineStart: 20, lineHeight: 2 }}><li>{language === "ar" ? lt("تحديد نطاق العمل ومخرجات واضحة") : "A scoped brief with clear deliverables"}</li><li>{language === "ar" ? lt("تحديثات ومراجعة ضمن النطاق") : "Progress updates and an in-scope review"}</li><li>{language === "ar" ? lt("تسليم منظم وملاحظات ختامية") : "A structured handoff with final notes"}</li></ul><button className="button" type="button" onClick={() => notify(t("contactNotice"))}><MessageCircle size={16} />{t("demoContact")}</button><p className="form-hint">{t("contactNotice")}</p></div></div></>;
}

function ListingForm() {
  const lt = useText();
  const { language, addListing, notify } = useMarketplace();
  const { activeProfile, recordActivity } = useDemoAuth();
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const [kind, setKind] = useState<"product" | "service">("product");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("phones");
  const [condition, setCondition] = useState<"new" | "used">("new");
  const [sellerType, setSellerType] = useState<"store" | "individual">("individual");
  const [city, setCity] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [delivery, setDelivery] = useState("");
  const [imageName, setImageName] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [preview, setPreview] = useState(false);
  const isValid = title.trim().length > 2 && description.trim().length > 9 && Number(price) > 0 &&
    (kind === "service" ? delivery.trim().length > 0 : city.length > 0);
  function onPreview(event: FormEvent) {
    event.preventDefault();
    if (!isValid) { notify(t("required")); return; }
    setPreview(true);
  }
  async function onSave() {
    if (!isValid) { notify(t("required")); return; }
    if (!activeProfile) return;
    const listing: LocalListing = {
      id: `local-${Date.now()}`, ownerId: activeProfile.id, title: title.trim(),
      titleAr: language === "ar" ? title.trim() : undefined,
      titleEn: language === "en" ? title.trim() : undefined,
      description: description.trim(), category,
      price: Number(price), city: city || activeProfile.city, condition,
      sellerType: activeProfile.type === "business" ? "store" : "individual",
      kind, createdAt: new Date().toISOString().slice(0, 10), delivery,
    };
    if (!await addListing({ ...listing, image: imagePreview || undefined })) return;
    recordActivity(activeProfile.id, "listing-added");
    setPreview(false);
    setTitle(""); setDescription(""); setPrice(""); setCity(""); setDelivery(""); setImageName(""); setImagePreview("");
    notify(t("savedLocally"));
  }
  const productCategories = ["phones", "laptops", "accessories", "audio", "computers", "gaming"];
  const serviceCategories = ["website", "mobile", "design", "support", "integration", "ecommerce", "consulting", "review", "automation", "custom"];
  if (!activeProfile) return <><div className="page-heading"><span className="eyebrow"><Plus size={15} />{t("sell")}</span><h1 className="page-title">{t("listTitle")}</h1><p className="page-intro">{t("listIntro")}</p></div><div className="content-card auth-prompt"><span className="service-icon"><UserRound size={22} /></span><h2>{t("listingOwnerRequired")}</h2><p>{t("localAccountNotice")}</p><div className="form-actions"><Link href="/login" className="button">{t("logIn")}</Link><Link href="/register" className="button secondary">{t("register")}</Link></div></div></>;
  const listingKinds = activeProfile.type === "business" ? ["product"] as const : ["product", "service"] as const;
  return <><div className="page-heading"><span className="eyebrow"><Plus size={15} />{t("sell")}</span><h1 className="page-title">{t("listTitle")}</h1><p className="page-intro">{t("listIntro")}</p></div><div className="info-banner"><ShieldCheck size={17} />{t("listIntro")}</div><form className="form-card" style={{ marginTop: 18 }} onSubmit={onPreview}><div className="filter-field" style={{ marginTop: 0, marginBottom: 20 }}><span className="form-field-label">{t("listingType")}</span><div className="radio-row">{listingKinds.map((value) => <button key={value} type="button" className={`choice-chip${kind === value ? " active" : ""}`} onClick={() => { setKind(value); setCategory(value === "product" ? "phones" : "website"); }}>{kind === value && <Check size={14} />}{t(value === "product" ? "productListing" : "serviceListing")}</button>)}</div></div><div className="form-grid">
    <FormField label={t("title")}><input className="field" required minLength={3} value={title} onChange={(event) => setTitle(event.target.value)} /></FormField>
    <FormField label={t("categoryLabel")}><select className="select" value={category} onChange={(event) => setCategory(event.target.value)}>{(kind === "product" ? productCategories : serviceCategories).map((value) => <option key={value} value={value}>{categoryName(value, language)}</option>)}</select></FormField>
    {kind === "product" ? <>
      <FormField label={t("condition")}><select className="select" value={condition} onChange={(event) => setCondition(event.target.value as "new" | "used")}><option value="new">{t("new")}</option><option value="used">{t("usedBadge")}</option></select></FormField>
      {activeProfile.type === "individual" && <FormField label={t("sellerType")}><select className="select" value={sellerType} onChange={(event) => setSellerType(event.target.value as "store" | "individual")}><option value="individual">{t("individual")}</option><option value="store">{t("store")}</option></select></FormField>}
      <FormField label={t("city")}><select className="select" required value={city} onChange={(event) => setCity(event.target.value)}><option value="">{t("chooseCity")}</option>{cities.map((value) => <option key={value} value={value}>{cityName(value, language)}</option>)}</select></FormField>
    </> : <FormField label={t("delivery")}><input className="field" required value={delivery} onChange={(event) => setDelivery(event.target.value)} placeholder={language === "ar" ? lt("مثال: أسبوعان") : "e.g. two weeks"} /></FormField>}
    <FormField label={t("priceJod")}><input className="field" type="number" required min="1" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} /></FormField>
    <FormField label={language === "ar" ? lt("صورة توضيحية (اختياري)") : "Sample image (optional)"}><input className="field" type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; setImageName(file?.name ?? ""); if (!file) { setImagePreview(""); return; } if (file.size > 1000000 || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) { notify(lt("اختر صورة PNG أو JPG أو WebP أصغر من 1 ميغابايت.")); return; } const reader = new FileReader(); reader.onload = () => setImagePreview(String(reader.result)); reader.readAsDataURL(file); }} />{imageName && <small className="form-hint">{imageName} · {language === "ar" ? lt("ستُحفظ مع الإعلان") : "Saved with your listing"}</small>}</FormField>
    <FormField label={t("descriptionLabel")} full><textarea className="textarea" required minLength={10} value={description} onChange={(event) => setDescription(event.target.value)} /></FormField>
    </div><div className="form-actions"><button className="button" type="submit"><Check size={15} />{t("submitPreview")}</button></div></form>
    {preview && <div className="preview-card"><div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" }}><div><span className="eyebrow">{t("preview")}</span><h2 style={{ margin: "8px 0" }}>{title}</h2></div><button className="icon-button" type="button" aria-label={t("cancel")} onClick={() => setPreview(false)}><X size={18} /></button></div>{imagePreview && <Image className="listing-image-preview" src={imagePreview} alt={title} width={1000} height={600} unoptimized />}<p className="detail-description">{description}</p><div className="product-bottom"><span>{categoryName(category, language)} · {kind === "product" ? `${cityName(city, language)} · ${condition === "new" ? t("new") : t("usedBadge")}` : delivery}</span><strong>{money(Number(price), language)}</strong></div><div className="info-banner notice-success" style={{ marginTop: 15 }}><CheckCircle2 size={16} />{language === "ar" ? lt("راجع التفاصيل، ثم اضغط نشر الإعلان لحفظه.") : "Review your details, then publish your listing."}</div><div className="form-actions"><button className="button" type="button" onClick={onSave}>{t("saveLocally")}</button><button className="button secondary" type="button" onClick={() => setPreview(false)}>{t("cancel")}</button></div></div>}
  </>;
}

function FormField({ label, children, full = false }: { label: string; children: ReactNode; full?: boolean }) {
  const id = useId();
  const control = Children.map(children, (child) => isValidElement(child) && ["input", "select", "textarea"].includes(String(child.type)) ? cloneElement(child as ReactElement<{ id?: string }>, { id }) : child);
  return <div className={`form-field${full ? " full" : ""}`}><label htmlFor={id}>{label}</label>{control}</div>;
}

function FavoritesPage({ products: favoriteProducts }: { products: Product[] }) {
  const { language } = useMarketplace();
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  return <><div className="page-heading"><span className="eyebrow"><Heart size={15} />{t("favorites")}</span><h1 className="page-title">{t("favoritesTitle")}</h1></div>{favoriteProducts.length ? <ProductGrid items={favoriteProducts} /> : <EmptyState title={t("favoritesEmpty")} text={t("favoritesEmpty")} href="/products" action={t("browseProducts")} />}</>;
}

function CartPage({ products: all, cart, setQuantity, removeFromCart }: { products: Product[]; cart: Record<string, number>; setQuantity: (id: string, quantity: number) => void; removeFromCart: (id: string) => void }) {
  const { language } = useMarketplace();
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const items = Object.entries(cart).map(([id, quantity]) => ({ product: all.find((item) => item.id === id), quantity })).filter((row): row is { product: Product; quantity: number } => !!row.product);
  const subtotal = items.reduce((sum, row) => sum + row.product.priceJod * row.quantity, 0);
  return <><div className="page-heading"><span className="eyebrow"><ShoppingCart size={15} />{t("cart")}</span><h1 className="page-title">{t("cartTitle")}</h1></div>{!items.length ? <EmptyState title={t("cartEmpty")} text={t("cartEmpty")} href="/products" action={t("continueShopping")} /> : <div className="detail-layout" style={{ gridTemplateColumns: "minmax(0, 1.5fr) minmax(270px, .7fr)" }}><div className="listing-list">{items.map(({ product, quantity }) => <div key={product.id} className="listing-row" style={{ alignItems: "center" }}><div style={{ display: "flex", alignItems: "center", gap: 13, minWidth: 0 }}><div style={{ width: 72, borderRadius: 10, overflow: "hidden", flex: "0 0 auto" }}><ProductArtwork product={product} /></div><div style={{ minWidth: 0 }}><Link href={`/products/${product.id}`}><strong>{language === "ar" ? product.nameAr : product.nameEn}</strong></Link><div className="form-hint">{money(product.priceJod, language)}</div></div></div><div style={{ display: "flex", alignItems: "center", gap: 7 }}><button type="button" className="small-action" aria-label="Decrease quantity" onClick={() => setQuantity(product.id, quantity - 1)}><Minus size={14} /></button><strong>{quantity}</strong><button type="button" className="small-action" aria-label="Increase quantity" onClick={() => setQuantity(product.id, quantity + 1)}><Plus size={14} /></button><button type="button" className="small-action" aria-label={t("remove")} onClick={() => removeFromCart(product.id)}><Trash2 size={14} /></button></div></div>)}</div><aside className="content-card" style={{ height: "fit-content" }}><h2 style={{ margin: 0, fontSize: 18 }}>{t("orderSummary")}</h2><div className="product-bottom"><span>{t("subtotal")}</span><strong>{money(subtotal, language)}</strong></div><p className="form-hint">{t("paymentUnavailable")}</p><Link className="button wide" href="/checkout">{t("checkout")}</Link></aside></div>}</>;
}

function AboutPage() {
  const { language } = useMarketplace();
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  return <><div className="page-heading"><span className="eyebrow"><Globe2 size={15} />RABT.AI</span><h1 className="page-title">{t("aboutTitle")}</h1></div><div className="content-card"><p className="detail-description" style={{ fontSize: 17 }}>{t("aboutText")}</p><div className="info-banner" style={{ marginTop: 24 }}><ShieldCheck size={17} />{t("scopeText")}</div><div className="steps-grid" style={{ marginTop: 26 }}>{[["discover", "qualityOne", "qualityOneText", Search], ["compare", "qualityTwo", "qualityTwoText", ArrowDownUp], ["transparent", "qualityThree", "qualityThreeText", ShieldCheck]].map(([key, title, text, Icon]) => { const StepIcon = Icon as LucideIcon; return <div className="step-card" key={key as string}><StepIcon size={21} color="#3973d6" /><h3>{t(title as Parameters<typeof translate>[1])}</h3><p>{t(text as Parameters<typeof translate>[1])}</p></div>; })}</div></div></>;
}

function HowPage() {
  const { language } = useMarketplace();
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const steps = [["01", "browseStep", Search, "/products"], ["02", "compareStep", ArrowDownUp, "/products"], ["03", "contactStep", MessageCircle, "/stores"], ["04", "postStep", Plus, "/sell"]] as const;
  return <><div className="page-heading"><span className="eyebrow"><Sparkles size={15} />RABT.AI</span><h1 className="page-title">{t("howTitle")}</h1><p className="page-intro">{t("heroText")}</p></div><div className="steps-grid">{steps.map(([number, key, Icon, href]) => <Link className="step-card" href={href} key={number}><Icon size={22} color="#3973d6" /><span className="step-number" style={{ marginInlineStart: 10 }}>{number}</span><h3>{t(key)}</h3><p>{key === "browseStep" ? t("browseText") : key === "compareStep" ? t("compareText") : t("connectText")}</p></Link>)}</div><div className="info-banner" style={{ marginTop: 24 }}><ShieldCheck size={17} />{t("demo")}</div></>;
}

function ComparePage({ items, clearCompare }: { items: Product[]; clearCompare: () => void }) {
  const { language, compare, toggleCompare, notify } = useMarketplace();
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const rows = [
    [t("price"), (product: Product) => money(product.priceJod, language)],
    [t("condition"), (product: Product) => product.condition === "used" ? t("usedBadge") : t("new")],
    [t("location"), (product: Product) => cityName(product.city, language)],
    [t("seller"), (product: Product) => stores.find((store) => store.id === product.sellerId)?.name ?? individualSellers.find((person) => person.id === product.sellerId)?.name ?? t("individual")],
    ...Array.from(new Set(items.flatMap((product) => Object.keys(product.specifications)))).map((key) => [specificationName(key, language), (product: Product) => product.specifications[key] ?? "—"] as [string, (product: Product) => string]),
  ] as [string, (product: Product) => string][];
  return <><div className="page-heading"><span className="eyebrow"><ArrowDownUp size={15} />{t("compareProducts")}</span><h1 className="page-title">{t("comparisonTitle")}</h1><p className="page-intro">{t("demo")}</p></div>{items.length < 2 ? <><EmptyState title={t("comparisonLimit")} text={t("comparisonLimit")} href="/products" action={t("browseProducts")} /><div className="section" style={{ marginTop: 25 }}><div className="product-grid">{seedProducts.filter((product) => !compare.includes(product.id)).slice(0, 4).map((product) => <div key={product.id}><ProductCard product={product} /><button type="button" className="button secondary small wide" style={{ marginTop: 7 }} onClick={() => { if (!toggleCompare(product.id)) notify(t("selectionLimit")); }}>{t("compareProducts")} <Plus size={14} /></button></div>)}</div></div></> : <><div style={{ display: "flex", justifyContent: "end", marginBottom: 12 }}><button className="button secondary small" type="button" onClick={clearCompare}>{t("clearCompare")}</button></div><div className="comparison-table-wrap"><table className="comparison-table"><thead><tr><th>{t("product")}</th>{items.map((product) => <th key={product.id}><ProductArtwork product={{ ...product, accent: product.accent }} /><Link href={`/products/${product.id}`} style={{ display: "block", marginTop: 9 }}>{language === "ar" ? product.nameAr : product.nameEn}</Link><button type="button" className="button ghost small" onClick={() => toggleCompare(product.id)}>{t("removeCompare")} <X size={13} /></button></th>)}</tr></thead><tbody>{rows.map(([label, value]) => <tr key={label}><th>{label}</th>{items.map((product) => <td key={product.id}>{translateContent(language, value(product))}</td>)}</tr>)}</tbody></table></div></>}</>;
}
