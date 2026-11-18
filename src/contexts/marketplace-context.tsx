"use client";

import { createContext, startTransition, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api-client";
import { products, services } from "@/data/marketplace";
import type { Language, LocalListing, Product, Service } from "@/types/marketplace";
import { profileDisplayName } from "@/types/demo-auth";
import { useDemoAuth } from "@/contexts/demo-auth-context";

type MarketplaceContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  cart: Record<string, number>;
  addToCart: (id: string) => void;
  removeFromCart: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  compare: string[];
  toggleCompare: (id: string) => boolean;
  clearCompare: () => void;
  listings: LocalListing[];
  addListing: (listing: LocalListing) => Promise<boolean>;
  updateListing: (listing: LocalListing) => Promise<boolean>;
  removeListing: (id: string) => Promise<boolean>;
  allProducts: Product[];
  allServices: Service[];
  toast: string;
  notify: (message: string) => void;
};

const MarketplaceContext = createContext<MarketplaceContextValue | null>(null);
type PersistedState = {
  language: Language;
  favorites: string[];
  cart: Record<string, number>;
  compare: string[];
  listings: LocalListing[];
  hydrated: boolean;
};

export function MarketplaceProvider({ children }: { children: React.ReactNode }) {
  const { profiles, activeProfile, hydrated: authReady } = useDemoAuth();
  const [state, setState] = useState<PersistedState>({
    language: "ar",
    favorites: [],
    cart: {},
    compare: [],
    listings: [],
    hydrated: false,
  });
  const { language, favorites, cart, compare, listings, hydrated } = state;
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!authReady) return;
    let active = true;
    Promise.all([api<{ listings: LocalListing[] }>("marketplace"), api<{ favorites: string[]; cart: Record<string, number>; compare: string[] }>("preferences")])
      .then(([market, preferences]) => { if (active) startTransition(() => setState({ language: window.localStorage.getItem("rabt-language") === "en" ? "en" : "ar", ...preferences, listings: market.listings, hydrated: true })); })
      .catch(() => { if (active) setToast("تعذر الاتصال بالخادم. أعد تحميل الصفحة."); });
    return () => { active = false; };
  }, [authReady, activeProfile?.id]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.title = language === "en" ? "RABT.AI | Jordan tech marketplace" : "RABT.AI | سوق الأردن للتقنية";
  }, [language]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem("rabt-language", language);
    api("preferences", "PUT", { favorites, cart, compare }).catch(() => setToast("تعذر حفظ السلة والمفضلة. أعد المحاولة."));
  }, [language, favorites, cart, compare, hydrated]);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  }, []);
  const setLanguage = (next: Language) => setState((current) => ({ ...current, language: next }));
  const toggleFavorite = (id: string) => setState((current) => ({
    ...current,
    favorites: current.favorites.includes(id) ? current.favorites.filter((value) => value !== id) : [...current.favorites, id],
  }));
  const addToCart = (id: string) => setState((current) => ({ ...current, cart: { ...current.cart, [id]: (current.cart[id] ?? 0) + 1 } }));
  const removeFromCart = (id: string) => setState((current) => {
    const next = { ...current.cart };
    delete next[id];
    return { ...current, cart: next };
  });
  const setQuantity = (id: string, quantity: number) => {
    if (quantity < 1) removeFromCart(id);
    else setState((current) => ({ ...current, cart: { ...current.cart, [id]: quantity } }));
  };
  const toggleCompare = (id: string) => {
    if (compare.includes(id)) {
      setState((current) => ({ ...current, compare: current.compare.filter((value) => value !== id) }));
      return true;
    }
    if (compare.length >= 3) return false;
    setState((current) => ({ ...current, compare: [...current.compare, id] }));
    return true;
  };
  const clearCompare = () => setState((current) => ({ ...current, compare: [] }));
  const addListing = async (listing: LocalListing) => {
    try { const saved = await api<LocalListing>("marketplace", "POST", listing); setState((current) => ({ ...current, listings: [saved, ...current.listings] })); return true; }
    catch (error) { notify((error as Error).message); return false; }
  };
  const updateListing = async (listing: LocalListing) => {
    try { const saved = await api<LocalListing>("marketplace", "PUT", listing); setState((current) => ({ ...current, listings: current.listings.map((item) => item.id === saved.id ? saved : item) })); return true; }
    catch (error) { notify((error as Error).message); return false; }
  };
  const removeListing = async (id: string) => {
    try {
      await api(`marketplace?id=${encodeURIComponent(id)}`, "DELETE");
      setState((current) => ({ ...current, listings: current.listings.filter((item) => item.id !== id), favorites: current.favorites.filter((item) => item !== id), compare: current.compare.filter((item) => item !== id), cart: Object.fromEntries(Object.entries(current.cart).filter(([key]) => key !== id)) })); return true;
    } catch (error) { notify((error as Error).message); return false; }
  };

  const allProducts = useMemo(() => [
    ...products,
    ...listings.filter((listing) => listing.kind === "product").map((listing): Product => ({
      id: listing.id,
      modelId: listing.id,
      image: listing.image,
      nameAr: listing.titleAr ?? listing.title,
      nameEn: listing.titleEn ?? listing.title,
      descriptionAr: listing.description,
      descriptionEn: listing.description,
      priceJod: listing.price,
      category: listing.category,
      condition: listing.condition,
      sellerType: listing.ownerId ? profiles.find((profile) => profile.id === listing.ownerId)?.type === "business" ? "store" : "individual" : listing.sellerType,
      sellerId: listing.ownerId ?? "local-user",
      city: listing.city,
      icon: "package",
      accent: "#dbeafe",
      specifications: { Listing: "إعلان منشور على رابط" },
      featured: false,
      createdAt: listing.createdAt,
    })),
  ], [listings, profiles]);
  const allServices = useMemo(() => [
    ...services,
    ...listings.filter((listing) => listing.kind === "service").map((listing): Service => ({
      id: listing.id,
      titleAr: listing.titleAr ?? listing.title,
      titleEn: listing.titleEn ?? listing.title,
      descriptionAr: listing.description,
      descriptionEn: listing.description,
      category: listing.category,
      price: listing.price,
      provider: listing.ownerId ? profiles.find((profile) => profile.id === listing.ownerId) ? profileDisplayName(profiles.find((profile) => profile.id === listing.ownerId)!, "en") : "RABT.AI" : "RABT.AI",
      providerId: listing.ownerId,
      delivery: listing.delivery || "â€”",
    })),
  ], [listings, profiles]);

  return (
    <MarketplaceContext.Provider value={{ language, setLanguage, favorites, toggleFavorite, cart, addToCart, removeFromCart, setQuantity, compare, toggleCompare, clearCompare, listings, addListing, updateListing, removeListing, allProducts, allServices, toast, notify }}>
      {children}
    </MarketplaceContext.Provider>
  );
}

export function useMarketplace() {
  const context = useContext(MarketplaceContext);
  if (!context) throw new Error("useMarketplace must be used within MarketplaceProvider");
  return context;
}
