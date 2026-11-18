"use client";

import { useText } from "@/i18n/use-text";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowUpLeft, CheckCircle2, Leaf, Mail, Moon, ShieldCheck, Sun, UsersRound } from "lucide-react";
import { api } from "@/lib/api-client";
import { individualSellers } from "@/data/marketplace";
import { useMarketplace } from "@/contexts/marketplace-context";
import { useDemoAuth } from "@/contexts/demo-auth-context";
import { profileDisplayName } from "@/types/demo-auth";
import type { Product } from "@/types/marketplace";

export function ThemeToggle() {
  const lt = useText();
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("rabt-theme");
    const next = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = next ? "dark" : "light";
    const timer = setTimeout(() => setDark(next), 0);
    return () => clearTimeout(timer);
  }, []);
  return <button className="icon-button theme-toggle" type="button" aria-label={dark ? lt("تفعيل الوضع الفاتح") : lt("تفعيل الوضع الداكن")} title={dark ? lt("الوضع الفاتح") : lt("الوضع الداكن")} onClick={() => {
    const next = !dark; setDark(next); document.documentElement.dataset.theme = next ? "dark" : "light"; localStorage.setItem("rabt-theme", next ? "dark" : "light");
  }}>{dark ? <Sun size={19} /> : <Moon size={19} />}</button>;
}

export function Community() {
  const lt = useText();
  return <section className="section community-section"><div className="section-heading"><div><span className="eyebrow"><UsersRound size={15} />{" "}{lt("مجتمع رابط")}</span><h2>{lt("ناس بتفهم بالتقنية. مثلك.")}</h2><p>{lt("تعرّف على شخصيات مجتمعنا التجريبي من أنحاء الأردن.")}</p></div><span className="community-label">{lt("حسابات عرض")}</span></div><div className="community-grid">{individualSellers.slice(0, 4).map((seller, index) => <Link href={`/products?seller=individual&search=${encodeURIComponent(seller.name)}`} className="community-card" key={seller.id}><span className={`community-avatar avatar-${index}`}>{lt(seller.name).slice(0, 1)}</span><strong>{lt(seller.name)}</strong><small dir="ltr">@{seller.username}</small><span className="community-city">{seller.city === "Amman" ? lt("عمّان") : seller.city === "Irbid" ? lt("إربد") : seller.city === "Salt" ? lt("السلط") : lt("مادبا")} {lt("· هاوي تقنية")}</span><span className="text-link">{lt("تصفّح المنتجات")}{" "}<ArrowUpLeft size={14} /></span></Link>)}</div></section>;
}

export function ContactForm() {
  const lt = useText();
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); setBusy(true); setError("");
    try { const result = await api<{ id: string }>("contact", "POST", { name: data.get("name"), email: data.get("email"), message: data.get("message"), consent: data.get("consent") === "on" }); setReference(result.id); form.reset(); }
    catch (error) { setError((error as Error).message); } finally { setBusy(false); }
  }
  return <><div className="page-heading"><span className="eyebrow"><Mail size={16} />{" "}{lt("نسمعك بكل اهتمام")}</span><h1 className="page-title">{lt("خلّينا على تواصل")}</h1><p className="page-intro">{lt("سؤال، اقتراح، بلاغ عن إعلان أو طلب متعلق ببياناتك؟ اكتب لنا هنا.")}</p></div><div className="contact-layout"><form className="form-card" onSubmit={submit}><div className="form-grid"><label className="form-field">{lt("الاسم")}{" "}<input name="name" className="field" required minLength={2} maxLength={100} autoComplete="name" /></label><label className="form-field">{lt("البريد الإلكتروني")}{" "}<input name="email" className="field" type="email" required maxLength={200} autoComplete="email" /></label><label className="form-field full">{lt("رسالتك")}{" "}<textarea name="message" className="textarea" required minLength={10} maxLength={5000} placeholder={lt("كيف نقدر نساعدك؟")} /></label></div><label className="consent-row"><input name="consent" type="checkbox" required /><span>{lt("أوافق على استخدام بياناتي لمعالجة طلبي وفق")}{" "}<Link href="/privacy">{lt("سياسة الخصوصية")}</Link>.</span></label><button disabled={busy} className="button" type="submit">{busy ? lt("جارٍ الحفظ…") : lt("إرسال الرسالة")}<ArrowUpLeft size={16} /></button>{error && <p role="alert" className="form-error">{lt(error)}</p>}{reference && <div className="info-banner notice-success" role="status" style={{ marginTop: 18 }}><CheckCircle2 size={18} /><span>{lt("تم حفظ رسالتك في النظام. رقم المتابعة:")}{" "}<b dir="ltr">{reference.slice(0, 8)}</b>{lt(". هذه النسخة تحفظ الرسائل محليًا على الخادم، ولا ترسل بريدًا إلكترونيًا.")}</span></div>}</form><aside className="contact-aside"><Leaf size={34} /><h2>{lt("رابط يجمعنا.")}</h2><p>{lt("مساحة أردنية للمنتجات التقنية والخدمات الرقمية، بوضوح واهتمام بالتفاصيل.")}</p><div><ShieldCheck size={18} /><span>{lt("للبلاغات: أرفق رابط الإعلان وسبب البلاغ.")}</span></div><div><UsersRound size={18} /><span>{lt("لطلبات الخصوصية: اذكر نوع الطلب وبريد حسابك دون إرسال كلمة المرور.")}</span></div></aside></div></>;
}

type SavedOrder = { id: string; total: number; status: string; createdAt: string; items: { title: string; titleEn?: string; quantity: number }[] };
export function Checkout({ products, cart }: { products: Product[]; cart: Record<string, number> }) {
  const lt = useText();
  const { activeProfile, hydrated } = useDemoAuth();
  const { language, removeFromCart } = useMarketplace();
  const [busy, setBusy] = useState(false); const [order, setOrder] = useState<SavedOrder | null>(null); const [error, setError] = useState("");
  const items = Object.entries(cart).map(([id, quantity]) => ({ product: products.find((p) => p.id === id), quantity })).filter((row): row is { product: Product; quantity: number } => !!row.product);
  const total = items.reduce((sum, row) => sum + row.product.priceJod * row.quantity, 0);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); setBusy(true); setError("");
    try { const result = await api<SavedOrder>("orders", "POST", { fullName: data.get("fullName"), email: data.get("email"), phone: data.get("phone"), consent: data.get("consent") === "on", items: items.map(({ product, quantity }) => ({ id: product.id, quantity })) }); setOrder(result); items.forEach(({ product }) => removeFromCart(product.id)); }
    catch (error) { setError((error as Error).message); } finally { setBusy(false); }
  }
  if (order) return <div className="order-success content-card"><CheckCircle2 size={52} /><span className="eyebrow">{lt("تم حفظ طلبك")}</span><h1>{lt("خطوة أقرب لتقنيتك الجديدة.")}</h1><p>{lt("رقم الطلب")}{" "}<strong dir="ltr">{order.id}</strong></p><p>{lt("الإجمالي:")}{" "}{order.total.toFixed(2)} {lt("د.أ · بانتظار المراجعة")}</p><p className="detail-description">{lt("تم إرسال طلبك إلى أصحاب المنتجات المسجلين، وستجده في طلباتي. لم يُخصم أي مبلغ، والتوفر والتسليم يُؤكّدان مع البائع. منتجات كتالوج العرض ليس لها بائع فعلي لاستلام الطلب.")}</p><Link className="button" href="/orders">{lt("عرض طلباتي")}</Link></div>;
  return <><div className="page-heading"><span className="eyebrow"><ShieldCheck size={16} />{" "}{lt("بكل وضوح")}</span><h1 className="page-title">{lt("تأكيد طلب الاهتمام")}</h1><p className="page-intro">{lt("عند التأكيد يصل الطلب وبيانات التواصل إلى أصحاب المنتجات المسجلين. منتجات كتالوج العرض توضيحية ولا تصل إلى بائع فعلي. لا يوجد دفع إلكتروني.")}</p></div>{hydrated && !activeProfile ? <div className="content-card"><p>{lt("سجّل الدخول لحفظ طلبك ومتابعته.")}</p><Link className="button" href="/login">{lt("تسجيل الدخول")}</Link></div> : !items.length ? <div className="content-card"><p>{lt("السلة فارغة.")}</p><Link className="button" href="/products">{lt("تصفّح المنتجات")}</Link></div> : <div className="detail-layout"><form className="form-card" onSubmit={submit}><div className="auth-fields"><label className="form-field">{lt("الاسم الكامل")}{" "}<input className="field" name="fullName" required minLength={2} maxLength={100} autoComplete="name" defaultValue={activeProfile ? profileDisplayName(activeProfile, language) : ""} /></label><label className="form-field">{lt("البريد الإلكتروني")}{" "}<input className="field" name="email" required type="email" autoComplete="email" defaultValue={activeProfile?.email} /></label><label className="form-field">{lt("رقم الهاتف الأردني")}{" "}<input className="field" name="phone" required type="tel" autoComplete="tel" placeholder="0791234567" defaultValue={activeProfile?.phone} /></label></div><label className="consent-row"><input name="consent" type="checkbox" required /><span>{lt("قرأت")}{" "}<Link href="/terms">{lt("الشروط والأحكام")}</Link> {lt("و")}{" "}<Link href="/returns">{lt("سياسة الإرجاع")}</Link> {lt("و")}{" "}<Link href="/privacy">{lt("الخصوصية")}</Link>{lt("، وأوافق على حفظ بياناتي ومشاركة اسمي ورقم هاتفي وبريدي الإلكتروني مع أصحاب المنتجات المطلوبة للتواصل بشأن هذا الطلب.")}</span></label><button className="button wide" disabled={busy || !activeProfile} type="submit">{busy ? lt("جارٍ حفظ الطلب…") : lt("حفظ طلب الاهتمام")}</button>{error && <p className="form-error" role="alert">{lt(error)}</p>}</form><aside className="content-card"><h2>{lt("ملخص الطلب")}</h2>{items.map(({ product, quantity }) => <div className="product-bottom" key={product.id}><span>{language === "ar" ? product.nameAr : product.nameEn} × {quantity}</span><strong>{(product.priceJod * quantity).toFixed(2)} {lt("د.أ")}</strong></div>)}<hr /><div className="product-bottom"><strong>{lt("الإجمالي")}</strong><strong>{total.toFixed(2)} {lt("د.أ")}</strong></div><p className="form-hint">{lt("الأسعار النهائية والشحن والضمان تُؤكّد مع البائع قبل أي اتفاق. أسعار بيانات العرض توضيحية.")}</p></aside></div>}</>;
}

export function Orders() {
  const { language } = useMarketplace();
  const lt = useText();
  const { activeProfile, hydrated } = useDemoAuth(); const [orders, setOrders] = useState<SavedOrder[] | null>(null); const [error, setError] = useState("");
  useEffect(() => { if (!activeProfile) return; api<SavedOrder[]>("orders").then(setOrders).catch((error) => setError(error.message)); }, [activeProfile]);
  return <><div className="page-heading"><span className="eyebrow">{lt("RABT / ORDERS")}</span><h1 className="page-title">{lt("طلباتك، بمكان واحد.")}</h1><p className="page-intro">{lt("طلبات اهتمام محفوظة في النظام، دون تحصيل دفعات.")}</p></div>{error && <p role="alert" className="form-error">{lt(error)}</p>}{hydrated && !activeProfile ? <Link className="button" href="/login">{lt("سجّل الدخول لعرض طلباتك")}</Link> : orders === null ? <p role="status">{lt("جارٍ تحميل الطلبات…")}</p> : orders.length ? <div className="orders-grid">{orders.map((order) => <article className="content-card" key={order.id}><div className="section-heading"><strong dir="ltr">{order.id}</strong><span className="badge">{lt("بانتظار المراجعة")}</span></div><p className="detail-description">{new Date(order.createdAt).toLocaleDateString(language === "ar" ? "ar-JO" : "en-JO", { timeZone: "Asia/Amman" })}</p>{order.items.map((item, i) => <p key={i}>{language === "en" ? item.titleEn ?? lt(item.title) : item.title} × {item.quantity}</p>)}<strong>{order.total.toFixed(2)} {lt("د.أ")}</strong></article>)}</div> : <div className="content-card"><p>{lt("لسّه ما عندك طلبات. اكتشف اختيارك القادم.")}</p><Link className="button" href="/products">{lt("تصفّح المنتجات")}</Link></div>}</>;
}

const legal = {
  terms: { title: "الشروط والأحكام", intro: "قواعد واضحة لتجربة عادلة للجميع.", sections: [
    ["١. طبيعة الخدمة", "رابط مساحة لعرض المنتجات التقنية والخدمات الرقمية والتواصل بشأنها داخل الأردن. هذه نسخة محلية قيد التطوير؛ بيانات الكتالوج والشخصيات والصور المنشأة توضيحية، وليست عروضًا تجارية مؤكدة. طلب الاهتمام لا يؤكد توفر المنتج أو البيع أو الشحن، ولا ينفذ دفعًا إلكترونيًا."],
    ["٢. الحساب والمسؤولية", "قدّم بيانات صحيحة واحفظ سرية كلمة المرور. الاستخدام المستقل للحساب مخصص لمن بلغ 18 عامًا، ولغير ذلك يلزم إشراف الولي حيث يقتضي القانون. أنت مسؤول عن المحتوى الذي تنشره وعن امتلاك حق عرضه. حسابات الجولة التجريبية مخصصة للاستكشاف ولا تستخدم فيها بيانات حساسة."],
    ["٣. قواعد النشر", "يُحظر الاحتيال، والإعلانات المضللة، وانتهاك حقوق الملكية، ونشر بيانات الغير دون سند مشروع، والسلع المسروقة أو المقلدة أو المحظورة قانونًا. بيّن حالة المستعمل والعيوب والسعر بالدينار الأردني بوضوح. يحق للمنصة تقييد المحتوى المخالف بعد مراجعته، ويمكن الاعتراض عبر نموذج التواصل."],
    ["٤. السعر والبيع والضمان", "يتعين على البائع توضيح هويته وصفته التجارية ومواصفات السلعة والتكاليف الإجمالية والشحن والضرائب المطبقة والضمان قبل إبرام البيع. اتفق مع البائع على التسليم وافحص المستعمل. لا تُعد شارة حساب أو صورة منتج شهادة اعتماد أو ضمانًا من رابط. لا تستبعد هذه الشروط أي حقوق آمرة للمستهلك أو مسؤوليات يقررها القانون."],
    ["٥. الشكاوى والنزاعات", "للإبلاغ عن محتوى أو مشكلة، استخدم صفحة التواصل وأرفق رقم الطلب أو رابط الإعلان. يبقى لك حق اللجوء إلى الجهات الرقابية والقضائية المختصة. تخضع الخدمة للقوانين الأردنية النافذة، وتُحدد الجهة القضائية المختصة وفق قواعد الاختصاص القانونية دون تقييد حقوق المستهلك."],
    ["٦. التحديثات", "تنشر التعديلات الجوهرية بتاريخ واضح، وتُطلب موافقة جديدة عندما تتطلب طبيعة التغيير ذلك. لا تسري التعديلات بأثر رجعي على حقوق نشأت قبلها. قبل الإطلاق التجاري يجب استكمال بيانات المشغل المسجل وعنوانه ووسائل التواصل ومراجعة النصوص من مختص أردني."],
  ] },
  privacy: { title: "سياسة الخصوصية", intro: "بيانات أقل. وضوح أكثر. وتحكّم بيدك.", sections: [
    ["١. ما نجمعه ولماذا", "نحفظ بيانات الحساب التي تقدمها: الاسم والبريد والهاتف والمدينة وبيانات المتجر والصورة الاختيارية، لتشغيل حسابك وإعلاناتك. ونحفظ بيانات طلب الاهتمام ورسائل التواصل لمعالجتها. كلمات المرور تحفظ كبصمات مشتقة مع ملح ولا تحفظ كنص واضح. لا نجمع أرقام بطاقات الدفع ولا نستخدم أدوات إعلانات أو تحليلات خارجية في هذه النسخة."],
    ["٢. ما يظهر للعامة", "يظهر اسم البائع أو المتجر والمدينة ووصفه وإعلاناته للزوار. لا تعرض واجهاتنا العامة بريد حسابك أو هاتفه. عند تأكيد الطلب وموافقتك، يظهر اسمك ورقم هاتفك وبريدك الإلكتروني للبائعين المعنيين بمنتجات الطلب ليتواصلوا معك بشأنه. يرى كل بائع منتجاته فقط وإجماليها، ولا يرى بقية السلة. لا يظهر الطلب أو بيانات التواصل للزوار أو للحسابات غير المعنية. الصور المنشأة والشخصيات التجريبية مميزة باعتبارها بيانات عرض."],
    ["٣. الموافقة وحقوقك", "تطلب النماذج موافقة واضحة غير محددة مسبقًا على المعالجة المبينة. يمكنك طلب الوصول إلى بياناتك أو نسخة منها أو تصحيحها أو حذفها أو الاعتراض أو سحب الموافقة وفق القانون والقيود النظامية المطبقة، عبر نموذج التواصل باختيار موضوع طلب الخصوصية في الرسالة. نصحح بيانات الحساب مباشرة من الإعدادات، ونتحقق من الهوية قبل الاستجابة لطلبات البيانات دون طلب كلمة المرور. لا يؤثر السحب على مشروعية المعالجة السابقة، وقد يوقف الوظائف التي تعتمد على البيانات."],
    ["٤. مكان التخزين والاحتفاظ", "في التشغيل المحلي تُخزن البيانات في ملف خاص داخل مجلد .data على الجهاز المشغّل للخادم، وتستمر بعد إعادة التشغيل. يحتفظ النظام بها حتى طلب الحذف أو حذفها تشغيليًا؛ إدارة طلبات الحذف والمراجعة تتم يدويًا بواسطة المشغل حاليًا. لا يوجد نقل خارجي تلقائي أو بريد مُرسل من النماذج. يجب تحديد سياسة مدد الاحتفاظ وموقع الاستضافة وأساس أي نقل عبر الحدود عند النشر التجاري."],
    ["٥. ملفات الارتباط والأمان", "نستخدم ملف ارتباط ضروريًا للجلسة لمدة تصل إلى 30 يومًا، وملفات تفضيل اللغة والمظهر في التخزين المحلي للمتصفح. لا توجد ملفات تتبع تسويقية. تتضمن الجلسة معرّفًا عشوائيًا محميًا من وصول JavaScript؛ تفعيل HTTPS عند الاستضافة ضروري لحماية الاتصال. يمكن مسح تفضيلات المتصفح أو إنهاء الجلسة من حسابك."],
    ["٦. التواصل والشكوى", "للملاحظات وطلبات الخصوصية استخدم نموذج التواصل. لا تقدم هذه النسخة بيانات جهة تشغيل مسجلة بعد؛ يجب استكمال اسم المسؤول عن المعالجة وعنوانه ووسائل الاتصال ومدد الاستجابة قبل الإطلاق التجاري. يبقى حقك في الشكوى لمديرية حماية البيانات الشخصية لدى وزارة الاقتصاد الرقمي والريادة وفق الإجراءات الرسمية."],
  ] },
  returns: { title: "سياسة الإرجاع والضمان", intro: "اعرف حقوقك قبل ما تتفق على الشراء.", sections: [
    ["١. النسخة الحالية", "يحفظ رابط طلبات اهتمام فقط. لا نحصل دفعات ولا نصدر تأكيدات بيع أو شحن، لذلك لا يوجد تحصيل أو استرداد عبر المنصة حاليًا. لا تدفع على أساس صور العرض أو الأسعار التوضيحية دون التحقق من البائع."],
    ["٢. قبل أي اتفاق بيع", "اطلب من البائع فاتورة أو إثباتًا يتضمن وصف المنتج وحالته والسعر والضمان والتسليم، واطلب توضيح سياسة الإرجاع والشحن والتكاليف قبل الالتزام. لا نفرض مدة إرجاع موحدة على كل السلع ولا نوحي بأن جميع مبيعات الأفراد لها نفس أحكام مزودي السلع التجاريين."],
    ["٣. العيوب وعدم المطابقة", "عند وجود عيب أو اختلاف عن الوصف، وثّق المشكلة وأبلغ البائع سريعًا واحتفظ بالإعلان وإثبات الشراء. تبقى حقوق المستهلك المقررة في التشريعات الأردنية بشأن السلع والخدمات المعيبة أو غير المطابقة نافذة بحسب الحالة، ولا تُسقطها عبارة عامة مثل: البضاعة لا تُرد ولا تُستبدل."],
    ["٤. السلع المستعملة والخدمات", "افحص حالة المستعمل والرقم التسلسلي والبطارية والملحقات والعيوب المعلنة قبل الشراء. وفي الخدمات الرقمية اتفق كتابيًا على النطاق والمخرجات والتعديلات والمدة والملكية وشروط الإلغاء. أي اتفاق خاص لا ينتقص من الحقوق القانونية الملزمة."],
    ["٥. البلاغ والمتابعة", "أرسل بلاغًا عبر التواصل مع رقم الطلب ورابط الإعلان ووصف المشكلة. حفظ البلاغ لا يعني صدور قرار باسترداد أو تنفيذ مطالبة؛ تتم المراجعة يدويًا. لا يقيّد ذلك حقك في مراجعة حماية المستهلك أو الجهات المختصة."],
  ] },
};
export function LegalPage({ kind }: { kind: keyof typeof legal }) {
  const lt = useText();
  const content = legal[kind];
  return <><div className="page-heading"><span className="eyebrow"><ShieldCheck size={16} />{" "}{lt("مركز الثقة")}</span><h1 className="page-title">{lt(content.title)}</h1><p className="page-intro">{lt(content.intro)}</p><small className="form-hint">{lt("آخر تحديث: 18 تشرين الثاني 2026 · نسخة التشغيل المحلي")}</small></div><div className="legal-layout"><nav className="legal-nav" aria-label={lt("السياسات")}><Link href="/terms" aria-current={kind === "terms" ? "page" : undefined}>{lt("الشروط والأحكام")}</Link><Link href="/privacy" aria-current={kind === "privacy" ? "page" : undefined}>{lt("سياسة الخصوصية")}</Link><Link href="/returns" aria-current={kind === "returns" ? "page" : undefined}>{lt("الإرجاع والضمان")}</Link><Link href="/contact">{lt("تواصل وبلاغات")}</Link></nav><article className="content-card legal-content">{content.sections.map(([title, text]) => <section key={title}><h2>{lt(title)}</h2><p>{lt(text)}</p></section>)}<div className="legal-sources"><h2>{lt("المراجع الأردنية الرسمية")}</h2><p>{lt("أُعدّت هذه الصياغة بالاستناد إلى الإطار التشريعي المبين في المصادر أدناه؛ لا تمثل شهادة امتثال قانوني.")}</p><a href="https://www.mit.gov.jo/AR/List/القوانين" target="_blank" rel="noreferrer">{lt("وزارة الصناعة والتجارة: قانون حماية المستهلك رقم 7 لسنة 2017")}</a><a href="https://modee.gov.jo/AR/List/القوانين_والأنظمة_و_التعليمات_الصادرة_بمقتضاه" target="_blank" rel="noreferrer">{lt("وزارة الاقتصاد الرقمي والريادة: قانون حماية البيانات الشخصية رقم 24 لسنة 2023 والأنظمة والتعليمات")}</a><a href="https://www.modee.gov.jo/AR/Pages/الخدمات" target="_blank" rel="noreferrer">{lt("خدمات حقوق البيانات والشكاوى لدى الوزارة")}</a></div></article></div></>;
}
