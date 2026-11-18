"use client";

import { useText } from "@/i18n/use-text";

import { Children, cloneElement, isValidElement, useId, useState, type FormEvent, type ReactElement, type ReactNode } from "react";
import Image from "next/image";
import { translateContent } from "@/i18n/content";
import { IncomingOrders, IncomingOrdersLink, IncomingOrdersSummary } from "@/components/incoming-orders";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BriefcaseBusiness, Clock3, LogOut, Pencil, Plus, Settings, ShieldCheck, Store, Trash2, UserRound } from "lucide-react";
import { cities } from "@/data/marketplace";
import { useDemoAuth } from "@/contexts/demo-auth-context";
import { useMarketplace } from "@/contexts/marketplace-context";
import { categoryName, translate } from "@/i18n/translations";
import { profileDisplayName, type DemoAccountType, type DemoProfile, type RegistrationDraft } from "@/types/demo-auth";
import type { LocalListing } from "@/types/marketplace";

type AccountRoute = "account" | "account-profile" | "account-listings" | "account-settings" | "account-orders";
type AccessRoute = "login" | "register" | "forgot-password";
type TranslationKey = Parameters<typeof translate>[1];

const cityLabels: Record<string, string> = { Amman: "عمّان", Irbid: "إربد", Zarqa: "الزرقاء", Aqaba: "العقبة", Salt: "السلط", Madaba: "مادبا" };
const businessCategories = ["electronics", "computers", "mobile", "other"] as const;
const businessCategoryKey: Record<(typeof businessCategories)[number], TranslationKey> = {
  electronics: "businessCategoryElectronics",
  computers: "businessCategoryComputers",
  mobile: "businessCategoryMobile",
  other: "businessCategoryOther",
};

function cityName(city: string, language: "ar" | "en") {
  return language === "ar" ? cityLabels[city] ?? city : city;
}

function AccountField({ label, children, full = false }: { label: string; children: ReactNode; full?: boolean }) {
  const id = useId();
  const controls = Children.map(children, (child) => isValidElement(child) && ["input", "select", "textarea"].includes(String(child.type)) ? cloneElement(child as ReactElement<{ id?: string }>, { id }) : child);
  return <div className={`form-field${full ? " full" : ""}`}><label htmlFor={id}>{label}</label>{controls}</div>;
}

function imageDataUrl(file: File): Promise<string> {
  if (file.size > 512 * 1024) return Promise.reject(new Error("image-size"));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("image-read"));
    reader.onerror = () => reject(new Error("image-read"));
    reader.readAsDataURL(file);
  });
}

function AccountNotice({ children, success = false }: { children: ReactNode; success?: boolean }) {
  return <div className={`info-banner${success ? " notice-success" : ""}`}><ShieldCheck size={17} />{children}</div>;
}

export function AccountAccessPage({ page }: { page: AccessRoute }) {
  const lt = useText();
  const { language, notify } = useMarketplace();
  const { login, loginWithDemoAccount, registerProfile } = useDemoAuth();
  const t = (key: TranslationKey) => translate(language, key);
  const router = useRouter();
  const [accountType, setAccountType] = useState<DemoAccountType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [fullName, setFullName] = useState("");
  const [businessNameAr, setBusinessNameAr] = useState("");
  const [businessNameEn, setBusinessNameEn] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [category, setCategory] = useState<(typeof businessCategories)[number]>("electronics");
  const [description, setDescription] = useState("");
  const [avatar, setAvatar] = useState("");

  const handleImage = async (file?: File) => {
    if (!file) return;
    try {
      setAvatar(await imageDataUrl(file));
    } catch (error) {
      if (error instanceof Error && error.message === "image-size") notify(t("avatarTooLarge"));
      else notify(t("fillRequired"));
    }
  };

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true);
    try { await login(email, password); router.push("/account"); }
    catch (error) { notify((error as Error).message); }
    finally { setSubmitting(false); }
  }
  async function handleDemoLogin(type: DemoAccountType) {
    setSubmitting(true);
    try { await loginWithDemoAccount(type); router.push("/account"); }
    catch (error) { notify((error as Error).message); }
    finally { setSubmitting(false); }
  }

  async function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accountType) return;
    if (!email.trim() || !phone.trim() || !city) {
      notify(t("fillRequired"));
      return;
    }
    if (accountType === "individual" && !fullName.trim()) {
      notify(t("fillRequired"));
      return;
    }
    if (accountType === "business" && (!businessNameAr.trim() || !businessNameEn.trim() || !address.trim() || !description.trim())) {
      notify(t("fillRequired"));
      return;
    }
    setSubmitting(true);
    const common = { email: email.trim(), phone: phone.trim(), city, ...(avatar ? { avatar } : {}) };
    const draft: RegistrationDraft = accountType === "individual"
      ? { ...common, fullName: fullName.trim() }
      : { ...common, businessNameAr: businessNameAr.trim(), businessNameEn: businessNameEn.trim(), address: address.trim(), category, description: description.trim() };
    try {
      if (!accepted) throw new Error(lt("يرجى الموافقة على الشروط وسياسة الخصوصية."));
      await registerProfile(accountType, draft, password);
      notify(lt("تم إنشاء حسابك بنجاح")); router.push("/account");
    } catch (error) { notify((error as Error).message); }
    finally { setSubmitting(false); }
  }

  if (page === "forgot-password") {
    return <><div className="page-heading"><span className="eyebrow"><ShieldCheck size={15} />{t("forgotPassword")}</span><h1 className="page-title">{t("passwordResetTitle")}</h1></div><div className="content-card auth-card"><AccountNotice>{t("passwordResetUnavailable")}</AccountNotice><p className="detail-description" style={{ marginTop: 16 }}>{t("localAccountNotice")}</p><Link className="button secondary" href="/login"><ArrowLeft size={15} />{t("passwordResetBack")}</Link></div></>;
  }

  if (page === "login") {
    return <><div className="page-heading"><span className="eyebrow"><UserRound size={15} />{" "}{lt("RABT community")}</span><h1 className="page-title">{t("loginTitle")}</h1><p className="page-intro">{lt("أهلًا بعودتك. تقنيتك ومجتمعك بمكان واحد.")}</p></div><div className="account-access-grid"><form className="form-card" onSubmit={handleLogin}><h2 className="access-title">{lt("تسجيل الدخول")}</h2><div className="auth-fields"><AccountField label={t("email")}><input className="field" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></AccountField><AccountField label={lt("كلمة المرور")}><input className="field" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></AccountField></div><button className="button wide" disabled={submitting} style={{ marginTop: 22 }}>{lt("دخول إلى حسابي")}</button><Link href="/register" className="text-link" style={{ marginTop: 18 }}>{lt("جديد على رابط؟ أنشئ حسابًا")}</Link></form><section className="content-card"><h2 className="access-title">{lt("خذ جولة في رابط")}</h2><p className="detail-description">{lt("حسابات عربية تجريبية لاستكشاف الموقع. ننشئ لك جلسة مستقلة؛ لا تستخدم بيانات حساسة في تجربة العرض.")}</p><div className="demo-login-actions"><button disabled={submitting} type="button" className="account-choice" onClick={() => void handleDemoLogin("individual")}><span className="account-choice-icon"><UserRound size={22} /></span><strong>{lt("رنا الخطيب")}</strong><span>{lt("@rana.tech · حساب عرض فردي")}</span></button><button disabled={submitting} type="button" className="account-choice" onClick={() => void handleDemoLogin("business")}><span className="account-choice-icon"><Store size={22} /></span><strong>{lt("زيتون للتقنية")}</strong><span>{lt("@zaytoun.tech · متجر عرض")}</span></button></div></section></div></>;
  }

  return <><div className="page-heading"><span className="eyebrow"><Plus size={15} />{t("registerTitle")}</span><h1 className="page-title">{t("registerTitle")}</h1><p className="page-intro">{t("registerIntro")}</p></div><AccountNotice>{t("localAccountNotice")} {t("noPassword")}</AccountNotice><section className="section account-type-grid" aria-label={t("chooseAccountType")}><button type="button" className={`account-type-card${accountType === "individual" ? " selected" : ""}`} onClick={() => setAccountType("individual")}><span className="account-choice-icon"><UserRound size={24} /></span><strong>{t("individualAccount")}</strong><span>{t("individualAccountText")}</span></button><button type="button" className={`account-type-card${accountType === "business" ? " selected" : ""}`} onClick={() => setAccountType("business")}><span className="account-choice-icon"><BriefcaseBusiness size={24} /></span><strong>{t("businessAccount")}</strong><span>{t("businessAccountText")}</span></button></section>{accountType && <form className="form-card" onSubmit={submitRegistration}><h2 className="access-title">{t(accountType === "individual" ? "personalDetails" : "businessDetails")}</h2><div className="form-grid">{accountType === "individual" ? <AccountField label={t("fullName")}><input className="field" autoComplete="name" required minLength={2} value={fullName} onChange={(event) => setFullName(event.target.value)} /></AccountField> : <><AccountField label={t("businessNameAr")}><input className="field" required value={businessNameAr} onChange={(event) => setBusinessNameAr(event.target.value)} /></AccountField><AccountField label={t("businessNameEn")}><input className="field" required value={businessNameEn} onChange={(event) => setBusinessNameEn(event.target.value)} /></AccountField></>}<AccountField label={t(accountType === "individual" ? "email" : "businessEmail")}><input className="field" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></AccountField><AccountField label={lt("كلمة المرور")}><input className="field" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} /><small className="form-hint">{lt("٨ أحرف على الأقل")}</small></AccountField><AccountField label={t("phone")}><input className="field" type="tel" autoComplete="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} /></AccountField><AccountField label={t("city")}><select className="select" required value={city} onChange={(event) => setCity(event.target.value)}><option value="">{t("chooseCity")}</option>{cities.map((item) => <option key={item} value={item}>{cityName(item, language)}</option>)}</select></AccountField>{accountType === "business" && <><AccountField label={t("address")}><input className="field" autoComplete="street-address" required value={address} onChange={(event) => setAddress(event.target.value)} /></AccountField><AccountField label={t("businessCategory")}><select className="select" value={category} onChange={(event) => setCategory(event.target.value as typeof category)}>{businessCategories.map((item) => <option key={item} value={item}>{t(businessCategoryKey[item])}</option>)}</select></AccountField><AccountField label={t("storeDescription")} full><textarea className="textarea" required minLength={10} value={description} onChange={(event) => setDescription(event.target.value)} /></AccountField></>}<AccountField label={t(accountType === "individual" ? "optionalAvatar" : "optionalLogo")} full><input className="field" type="file" accept="image/*" onChange={(event) => void handleImage(event.target.files?.[0])} /><small className="form-hint">{t("avatarTooLarge")}</small>{avatar && <Image className="profile-image-preview" src={avatar} alt={t(accountType === "individual" ? "optionalAvatar" : "optionalLogo")} width={72} height={72} unoptimized />}</AccountField></div><label className="consent-row"><input type="checkbox" required checked={accepted} onChange={(e) => setAccepted(e.target.checked)} /><span>{lt("أوافق على")}{" "}<Link href="/terms" target="_blank">{lt("الشروط والأحكام")}</Link> {lt("و")}{" "}<Link href="/privacy" target="_blank">{lt("سياسة الخصوصية")}</Link>{lt("، وأبلغ 18 عامًا أو أستخدم الخدمة بإشراف ولي الأمر.")}</span></label><div className="form-actions"><button className="button" type="submit" disabled={submitting}>{submitting ? t("localOnly") : t("createProfile")}</button><Link className="button secondary" href="/login">{t("loginLink")}</Link></div><p className="form-hint">{t("demoOnlyRegistration")}</p></form>}</>;
}

export function AccountPage({ page }: { page: AccountRoute }) {
  const lt = useText();
  const { language, favorites, listings } = useMarketplace();
  const { activeProfile, activity, hydrated, logout } = useDemoAuth();
  const t = (key: TranslationKey) => translate(language, key);
  const router = useRouter();

  if (!hydrated) return <div className="page-heading"><span className="eyebrow">{t("localOnly")}</span><h1 className="page-title">{t("account")}</h1></div>;
  if (!activeProfile) return <div className="page-heading"><h1 className="page-title">{t("accountTitle")}</h1><div className="content-card auth-prompt"><AccountNotice>{t("localAccountNotice")}</AccountNotice><div className="form-actions"><Link href="/login" className="button">{t("logIn")}</Link><Link href="/register" className="button secondary">{t("register")}</Link></div></div></div>;

  const ownListings = listings.filter((listing) => listing.ownerId === activeProfile.id);
  const accountLinks: { href: string; key: TranslationKey; page?: AccountRoute }[] = [
    { href: "/account", key: "dashboard", page: "account" },
    { href: "/account/listings", key: "listings", page: "account-listings" },
    { href: "/account/profile", key: "profileSettings", page: "account-profile" },
    { href: "/account/settings", key: "settings", page: "account-settings" },
    { href: "/favorites", key: "favorites" },
  ];
  const name = profileDisplayName(activeProfile, language);
  const title = activeProfile.type === "business" ? t("businessDashboard") : t("individualDashboard");
  return <><div className="page-heading"><span className="eyebrow"><UserRound size={15} />{t("account")}</span><h1 className="page-title">{title}</h1><p className="page-intro">{t("dashboardWelcome")}{lt("،")}{" "}{name}</p></div><AccountNotice>{t("localAccountNotice")}</AccountNotice><div className="account-layout"><aside className="account-sidebar"><div className="account-sidebar-profile"><span className="account-avatar large">{activeProfile.avatar ? <Image src={activeProfile.avatar} alt="" width={58} height={58} unoptimized /> : name.slice(0, 1)}</span><strong>{name}</strong><small>{t(activeProfile.type === "individual" ? "individualAccount" : "businessAccount")}</small></div><nav aria-label={t("authMenu")}><IncomingOrdersLink />{accountLinks.map((item) => <Link key={item.href} href={item.href} className={page === item.page ? "active" : ""}>{item.page === "account" ? <UserRound size={16} /> : item.page === "account-listings" ? <Store size={16} /> : item.page === "account-profile" ? <Pencil size={16} /> : item.page === "account-settings" ? <Settings size={16} /> : <UserRound size={16} />}{t(item.key)}</Link>)}</nav></aside><section className="account-content">{page === "account-orders" ? <IncomingOrders /> : page === "account-profile" ? <ProfileEditor profile={activeProfile} /> : page === "account-listings" ? <ListingManager profile={activeProfile} listings={ownListings} /> : page === "account-settings" ? <AccountSettings profile={activeProfile} onLogout={() => { logout(); router.push("/"); }} /> : <Dashboard profile={activeProfile} listings={ownListings} favoritesCount={favorites.length} activity={activity.filter((item) => item.profileId === activeProfile.id).slice(0, 5)} />}</section></div></>;
}

function Dashboard({ profile, listings, favoritesCount, activity }: { profile: DemoProfile; listings: LocalListing[]; favoritesCount: number; activity: ReturnType<typeof useDemoAuth>["activity"] }) {
  const lt = useText();
  const { language } = useMarketplace();
  const t = (key: TranslationKey) => translate(language, key);
  const ownProducts = listings.filter((item) => item.kind === "product");
  const ownServices = listings.filter((item) => item.kind === "service");
  const storeUrl = profile.type === "business" ? `/stores/${profile.id}` : "";
  const activityKeys: Record<string, TranslationKey> = { login: "activityLogin", register: "activityRegister", "listing-added": "activityListingAdded", "listing-updated": "activityListingUpdated", "listing-removed": "activityListingRemoved", "profile-updated": "activityProfileUpdated" };
  return <>
    <IncomingOrdersSummary />
    <div className="dashboard-welcome">
      <div>
        <span className="eyebrow"><Clock3 size={15} />{t("sessionActive")}</span>
        <h2>{t("dashboardWelcome")}{lt("،")}{" "}{profileDisplayName(profile, language)}</h2>
        <p>{t(profile.type === "individual" ? "individualDashboard" : "businessDashboard")}</p>
      </div>
      <Link className="button" href="/sell"><Plus size={15} />{t(profile.type === "business" ? "addProduct" : "postListing")}</Link>
    </div>
    {profile.type === "business" && <div className="storefront-preview">
      <span className="store-avatar">{profile.avatar ? <Image src={profile.avatar} alt="" width={48} height={48} unoptimized /> : profile.businessNameEn.slice(0, 2).toUpperCase()}</span>
      <div><strong>{profileDisplayName(profile, language)}</strong><p>{translateContent(language, profile.description)}</p><small>{translateContent(language, profile.address)} · {cityName(profile.city, language)}</small></div>
      <Link href={storeUrl} className="button secondary small">{t("storefrontPreview")}</Link>
    </div>}
    <div className="account-stat-grid">
      <StatCard label={t(profile.type === "business" ? "productListings" : "localProducts")} value={ownProducts.length} icon={<Store size={19} />} />
      <StatCard label={t(profile.type === "business" ? "localServices" : "serviceListings")} value={ownServices.length} icon={<BriefcaseBusiness size={19} />} />
      <StatCard href="/favorites" label={t("favoritesCount")} value={favoritesCount} icon={<UserRound size={19} />} />
    </div>
    <div className="dashboard-panels">
      <section className="content-card">
        <div className="section-heading"><h2>{t("recentListings")}</h2><Link className="text-link" href="/account/listings">{t("listings")}</Link></div>
        <div className="dashboard-listing-groups">
          <DashboardListingGroup label={t(profile.type === "business" ? "productListings" : "localProducts")} listings={ownProducts} />
          {profile.type === "individual" && <DashboardListingGroup label={t("serviceListings")} listings={ownServices} />}
        </div>
        {!listings.length && <div className="account-empty"><p>{t("noOwnedListings")}</p><Link href="/sell" className="button secondary small">{t(profile.type === "business" ? "addProduct" : "postListing")}</Link></div>}
      </section>
      <section className="content-card">
        <h2 className="panel-title">{t("recentActivity")}</h2>
        {activity.length ? <div className="activity-list">{activity.map((item) => <div className="activity-row" key={item.id}><span className="activity-dot" /><span>{t(activityKeys[item.action] ?? "sessionActive")}</span><time>{new Date(item.occurredAt).toLocaleDateString(language === "ar" ? "ar-JO" : "en-GB", { timeZone: "UTC" })}</time></div>)}</div> : <p className="detail-description">{t("recentActivity")}</p>}
      </section>
    </div>
  </>;
}

function DashboardListingGroup({ label, listings }: { label: string; listings: LocalListing[] }) {
  const lt = useText();
  const { language } = useMarketplace();
  const t = (key: TranslationKey) => translate(language, key);
  return <section className="dashboard-listing-group"><h3>{label} <span>{listings.length}</span></h3>{listings.length ? listings.slice(0, 3).map((listing) => <div className="dashboard-listing-row" key={listing.id}><span>{listingTitle(listing, language)}</span><strong>{listing.price} {language === "ar" ? lt("د.أ") : "JOD"}</strong></div>) : <p className="form-hint">{t("noOwnedListings")}</p>}</section>;
}

function StatCard({ label, value, icon, href }: { label: string; value: number; icon: ReactNode; href?: string }) {
  const content = <><span className="stat-icon">{icon}</span><strong>{value}</strong><small>{label}</small></>;
  return href ? <Link className="account-stat account-stat-link" href={href}>{content}</Link> : <div className="account-stat">{content}</div>;
}

function ProfileEditor({ profile }: { profile: DemoProfile }) {
  const { language, notify } = useMarketplace();
  const { updateProfile } = useDemoAuth();
  const t = (key: TranslationKey) => translate(language, key);
  const [draft, setDraft] = useState<DemoProfile>(profile);
  const [busy, setBusy] = useState(false);
  function updateShared(key: "email" | "phone" | "city" | "avatar", value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }
  function updateIndividual(value: string) {
    setDraft((current) => current.type === "individual" ? { ...current, fullName: value } : current);
  }
  function updateBusiness(key: "businessNameAr" | "businessNameEn" | "address" | "category" | "description", value: string) {
    setDraft((current) => current.type === "business" ? { ...current, [key]: value } : current);
  }
  async function changeAvatar(file?: File) {
    if (!file) return;
    try {
      const avatar = await imageDataUrl(file);
      setDraft((current) => ({ ...current, avatar }));
    } catch (error) {
      notify(error instanceof Error && error.message === "image-size" ? t("avatarTooLarge") : t("fillRequired"));
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft.type === "individual" && !draft.fullName.trim()) { notify(t("fillRequired")); return; }
    if (draft.type === "business" && (!draft.businessNameAr.trim() || !draft.businessNameEn.trim() || !draft.description.trim())) { notify(t("fillRequired")); return; }
    setBusy(true);
    try { await updateProfile(draft); } catch (error) { notify((error as Error).message); setBusy(false); return; }
    notify(t("profileSaved"));
    setBusy(false);
  }
  return <div className="content-card"><h2 className="panel-title">{t(draft.type === "individual" ? "personalDetails" : "businessDetails")}</h2><AccountNotice>{t("profileSavedNotice")}</AccountNotice><form onSubmit={submit}><div className="form-grid account-form-grid">{draft.type === "individual" ? <AccountField label={t("fullName")}><input className="field" required value={draft.fullName} onChange={(event) => updateIndividual(event.target.value)} /></AccountField> : <><AccountField label={t("businessNameAr")}><input className="field" required value={draft.businessNameAr} onChange={(event) => updateBusiness("businessNameAr", event.target.value)} /></AccountField><AccountField label={t("businessNameEn")}><input className="field" required value={draft.businessNameEn} onChange={(event) => updateBusiness("businessNameEn", event.target.value)} /></AccountField></>}<AccountField label={t(draft.type === "individual" ? "email" : "businessEmail")}><input className="field" required type="email" value={draft.email} onChange={(event) => updateShared("email", event.target.value)} /></AccountField><AccountField label={t("phone")}><input className="field" required type="tel" value={draft.phone} onChange={(event) => updateShared("phone", event.target.value)} /></AccountField><AccountField label={t("city")}><select className="select" value={draft.city} onChange={(event) => updateShared("city", event.target.value)}>{cities.map((item) => <option key={item} value={item}>{cityName(item, language)}</option>)}</select></AccountField>{draft.type === "business" && <><AccountField label={t("address")}><input className="field" required value={draft.address} onChange={(event) => updateBusiness("address", event.target.value)} /></AccountField><AccountField label={t("businessCategory")}><select className="select" value={draft.category} onChange={(event) => updateBusiness("category", event.target.value)}>{businessCategories.map((item) => <option key={item} value={item}>{t(businessCategoryKey[item])}</option>)}</select></AccountField><AccountField label={t("storeDescription")} full><textarea className="textarea" required minLength={10} value={draft.description} onChange={(event) => updateBusiness("description", event.target.value)} /></AccountField></>}<AccountField label={t(draft.type === "individual" ? "optionalAvatar" : "optionalLogo")} full><input className="field" type="file" accept="image/*" onChange={(event) => void changeAvatar(event.target.files?.[0])} />{draft.avatar && <Image className="profile-image-preview" src={draft.avatar} alt={t(draft.type === "individual" ? "optionalAvatar" : "optionalLogo")} width={72} height={72} unoptimized />}</AccountField></div><div className="form-actions"><button className="button" type="submit" disabled={busy}>{t("saveProfile")}</button></div></form></div>;
}

function ListingManager({ profile, listings }: { profile: DemoProfile; listings: LocalListing[] }) {
  const lt = useText();
  const { language, updateListing, removeListing, notify } = useMarketplace();
  const { recordActivity } = useDemoAuth();
  const t = (key: TranslationKey) => translate(language, key);
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [draft, setDraft] = useState<LocalListing | null>(null);
  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || draft.ownerId !== profile.id || draft.title.trim().length < 3 || draft.description.trim().length < 10 || draft.price <= 0) {
      notify(t("fillRequired"));
      return;
    }
    if (!await updateListing({ ...draft, title: draft.title.trim(), description: draft.description.trim() })) return;
    recordActivity(profile.id, "listing-updated");
    setEditing(null); setDraft(null);
    notify(t("listingUpdated"));
  }
  async function confirmDelete(listing: LocalListing) {
    if (!await removeListing(listing.id)) return;
    recordActivity(profile.id, "listing-removed");
    setDeleting(null);
    notify(t("listingRemoved"));
  }
  return <div><div className="section-heading"><div><h2>{t("listings")}</h2><p>{t(profile.type === "business" ? "productListings" : "myListings")}</p></div><Link href="/sell" className="button small"><Plus size={14} />{t(profile.type === "business" ? "addProduct" : "postListing")}</Link></div><AccountNotice>{t("localAccountNotice")}</AccountNotice>{listings.length ? <div className="managed-listings">{listings.map((listing) => <article className="managed-listing" key={listing.id}>{editing === listing.id && draft ? <form onSubmit={saveEdit}><div className="form-grid"><AccountField label={t("title")}><input className="field" required minLength={3} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value, titleAr: language === "ar" ? event.target.value : draft.titleAr, titleEn: language === "en" ? event.target.value : draft.titleEn })} /></AccountField><AccountField label={t("priceJod")}><input className="field" required type="number" min="1" value={draft.price} onChange={(event) => setDraft({ ...draft, price: Number(event.target.value) })} /></AccountField><AccountField label={t("descriptionLabel")} full><textarea className="textarea" required minLength={10} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></AccountField></div><div className="form-actions"><button className="button small" type="submit">{t("saveProfile")}</button><button className="button secondary small" type="button" onClick={() => { setEditing(null); setDraft(null); }}>{t("cancel")}</button></div></form> : <><div className="managed-listing-main"><span className="listing-kind-icon">{listing.kind === "product" ? <Store size={19} /> : <BriefcaseBusiness size={19} />}</span><div><h3>{listingTitle(listing, language)}</h3><p>{t(listing.kind === "product" ? "productListing" : "serviceListing")} · {categoryName(listing.category, language)} · {listing.price} {language === "ar" ? lt("د.أ") : "JOD"}</p></div></div><div className="managed-listing-actions"><button className="button secondary small" type="button" onClick={() => { setEditing(listing.id); setDraft({ ...listing }); setDeleting(null); }}><Pencil size={14} />{t("editListing")}</button><button className="button danger small" type="button" onClick={() => setDeleting(listing.id)}><Trash2 size={14} />{t("deleteListing")}</button></div>{deleting === listing.id && <div className="delete-confirm" role="group" aria-label={t("confirmDelete")}><span>{t("confirmDelete")}</span><button className="button danger small" type="button" onClick={() => confirmDelete(listing)}>{t("deleteListing")}</button><button className="button secondary small" type="button" onClick={() => setDeleting(null)}>{t("cancel")}</button></div>}</>}</article>)}</div> : <div className="account-empty"><Store size={24} /><p>{t("noOwnedListings")}</p><Link href="/sell" className="button secondary small">{t(profile.type === "business" ? "addProduct" : "postListing")}</Link></div>}</div>;
}

function AccountSettings({ profile, onLogout }: { profile: DemoProfile; onLogout: () => void }) {
  const { language } = useMarketplace();
  const t = (key: TranslationKey) => translate(language, key);
  return <div className="content-card"><h2 className="panel-title">{t("accountType")}</h2><div className="account-settings-row"><span className="account-choice-icon">{profile.type === "business" ? <Store size={21} /> : <UserRound size={21} />}</span><div><strong>{t(profile.type === "individual" ? "individualAccount" : "businessAccount")}</strong><p>{t("localOnly")}</p></div><span className="badge">{t("sessionActive")}</span></div><div className="settings-notice"><AccountNotice>{t("localAccountNotice")} {t("noPassword")}</AccountNotice></div><div className="settings-actions"><Link href="/account/profile" className="button secondary"><Settings size={15} />{t("profileSettings")}</Link><button className="button danger" type="button" onClick={onLogout}><LogOut size={15} />{t("logout")}</button></div></div>;
}

function listingTitle(listing: LocalListing, language: "ar" | "en") {
  return language === "ar" ? listing.titleAr ?? listing.title : listing.titleEn ?? listing.title;
}
