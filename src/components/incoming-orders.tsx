"use client";

import { useText } from "@/i18n/use-text";

import Link from "next/link";
import { useState } from "react";
import { useMarketplace } from "@/contexts/marketplace-context";
import { CheckCheck, Inbox, Mail, Phone, RefreshCw, ShoppingBag } from "lucide-react";
import { useDemoAuth } from "@/contexts/demo-auth-context";
import { useIncomingOrders } from "@/contexts/incoming-orders-context";

export function IncomingOrdersLink({ compact = false }: { compact?: boolean }) {
  const lt = useText();
  const { unreadCount } = useIncomingOrders();
  return <Link href="/account/orders" className={compact ? "icon-button inbox-link" : "inbox-account-link"} aria-label={lt("الطلبات الواردة{0}", unreadCount ? lt("، {0} جديدة", unreadCount) : "")}><Inbox size={compact ? 19 : 17} />{!compact && <span>{lt("الطلبات الواردة")}</span>}{unreadCount > 0 && <span className={compact ? "count-badge" : "inbox-count"}>{unreadCount}</span>}</Link>;
}

export function IncomingOrdersSummary() {
  const lt = useText();
  const { orders, unreadCount, error } = useIncomingOrders();
  return <Link href="/account/orders" className={`inbox-summary${unreadCount ? " has-new" : ""}`}><span className="service-icon"><Inbox size={24} /></span><div><strong>{unreadCount ? lt("عندك {0} {1} على منتجاتك", unreadCount, unreadCount === 1 ? "طلب جديد" : "طلبات جديدة") : lt("طلبات العملاء على منتجاتك")}</strong><p>{error ? lt("تعذر تحديث الطلبات. افتح الصندوق لإعادة المحاولة.") : lt("شوف مين طلب منك، تفاصيل المنتجات ومعلومات التواصل. {0} طلب وارد.", orders.length)}</p></div><span className="text-link">{lt("عرض الطلبات ←")}</span></Link>;
}

export function IncomingOrders() {
  const { language } = useMarketplace();
  const lt = useText();
  const { activeProfile, hydrated } = useDemoAuth();
  const { orders, unreadCount, loading, error, refresh, markRead } = useIncomingOrders();
  const [busy, setBusy] = useState<string | null>(null);
  const [onlyNew, setOnlyNew] = useState(false);
  async function reload() { setBusy("refresh"); try { await refresh(); } finally { setBusy(null); } }
  async function read(id: string) { setBusy(id); try { await markRead(id); } finally { setBusy(null); } }
  if (!hydrated) return <p role="status">{lt("جارٍ تحميل الحساب…")}</p>;
  if (!activeProfile) return <div className="content-card"><h2>{lt("سجّل الدخول لعرض طلبات العملاء")}</h2><p>{lt("هذه الخانة متاحة لحسابات المتاجر والأفراد.")}</p><Link className="button" href="/login">{lt("تسجيل الدخول")}</Link></div>;
  const visible = onlyNew ? orders.filter((order) => !order.readAt) : orders;
  return <><div className="section-heading inbox-heading"><div><span className="eyebrow"><Inbox size={16} />{" "}{lt("صندوق طلباتك")}</span><h2>{lt("الطلبات الواردة")}</h2><p>{lt("طلبات العملاء على منتجاتك، مع بيانات التواصل لإكمال الاتفاق.")}</p></div><button className="button secondary small" disabled={busy !== null || loading} onClick={() => void reload()}><RefreshCw size={15} />{" "}{lt("تحديث")}</button></div><div className="inbox-toolbar"><span>{lt("{0} طلب · {1} جديد", orders.length, unreadCount)}</span><label><input type="checkbox" checked={onlyNew} onChange={(event) => setOnlyNew(event.target.checked)} />{" "}{lt("الجديدة فقط")}</label></div>{error && <div className="form-error" role="alert">{lt(error)}</div>}{loading ? <p role="status">{lt("جارٍ تحميل الطلبات…")}</p> : !visible.length ? <div className="content-card inbox-empty"><Inbox size={40} /><h3>{onlyNew ? lt("كل الطلبات مقروءة") : lt("لسّه ما وصلك طلب")}</h3><p>{lt("لما عميل يؤكّد طلبًا على أحد منتجاتك، يظهر هون مع اسمه ورقم هاتفه وبريده.")}</p><Link href="/sell" className="button secondary">{lt("أضف منتجًا")}</Link></div> : <div className="incoming-orders-list">{visible.map((order) => <article className={`content-card incoming-order${order.readAt ? "" : " unread"}`} key={order.id}><div className="section-heading"><div><strong dir="ltr">{order.id}</strong><p className="form-hint"><time dateTime={order.createdAt}>{new Date(order.createdAt).toLocaleString(language === "ar" ? "ar-JO" : "en-JO", { timeZone: "Asia/Amman", dateStyle: "medium", timeStyle: "short" })}</time></p></div><span className={`badge ${order.readAt ? "" : "new-order-badge"}`}>{order.readAt ? lt("تم الاطلاع") : lt("طلب جديد")}</span></div><div className="buyer-contact"><h3>{lt("طلب من:")}{" "}{order.fullName}</h3><a href={`tel:${order.phone.replace(/[\s-]/g, "")}`}><Phone size={16} /><bdi>{order.phone}</bdi></a><a href={`mailto:${order.email}`}><Mail size={16} /><bdi>{order.email}</bdi></a></div><div className="incoming-items">{order.items.map((item, index) => <div key={`${item.id}-${index}`}><ShoppingBag size={17} /><span>{language === "en" ? item.titleEn ?? lt(item.title) : item.title}<small>{lt("الكمية:")}{" "}{item.quantity} {lt("· سعر الوحدة:")}{" "}{item.price.toFixed(2)} {lt("د.أ")}</small></span><strong>{(item.price * item.quantity).toFixed(2)} {lt("د.أ")}</strong></div>)}</div><div className="incoming-order-bottom"><strong>{lt("إجمالي منتجاتك:")}{" "}{order.total.toFixed(2)} {lt("د.أ")}</strong>{!order.readAt && <button className="button small" disabled={busy !== null} onClick={() => void read(order.id)}><CheckCheck size={16} />{busy === order.id ? lt("جارٍ الحفظ…") : lt("تحديد كمقروء")}</button>}</div><p className="form-hint">{lt("طلب اهتمام دون دفع إلكتروني. تواصل مع المشتري لتأكيد التوفر والتسليم. استخدم بياناته لمعالجة هذا الطلب فقط.")}</p></article>)}</div>}</>;
}
