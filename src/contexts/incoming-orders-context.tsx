"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { useDemoAuth } from "@/contexts/demo-auth-context";
import type { IncomingOrdersResult } from "@/types/orders";

type InboxValue = IncomingOrdersResult & { loading: boolean; error: string; refresh: () => Promise<void>; markRead: (id: string) => Promise<boolean> };
const Context = createContext<InboxValue | null>(null);
export function IncomingOrdersProvider({ children }: { children: React.ReactNode }) {
  const { activeProfile } = useDemoAuth();
  const profileId = activeProfile?.id;
  const [state, setState] = useState<IncomingOrdersResult & { profileId?: string; error: string }>({ orders: [], unreadCount: 0, error: "" });
  const refresh = useCallback(async () => {
    if (!profileId) return;
    try { const result = await api<IncomingOrdersResult>("incoming-orders"); setState({ ...result, profileId, error: "" }); }
    catch (error) { setState((current) => ({ ...(current.profileId === profileId ? current : { orders: [], unreadCount: 0 }), profileId, error: (error as Error).message })); }
  }, [profileId]);
  useEffect(() => {
    if (!profileId) return;
    let alive = true;
    const update = async () => {
      try { const result = await api<IncomingOrdersResult>("incoming-orders"); if (alive) setState({ ...result, profileId, error: "" }); }
      catch (error) { if (alive) setState((current) => ({ ...(current.profileId === profileId ? current : { orders: [], unreadCount: 0 }), profileId, error: (error as Error).message })); }
    };
    void update();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void update(); }, 30000);
    const onFocus = () => { void update(); };
    window.addEventListener("focus", onFocus);
    return () => { alive = false; clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, [profileId]);
  async function markRead(id: string) {
    if (!profileId) return false;
    try { const result = await api<IncomingOrdersResult>("incoming-orders", "PATCH", { id }); setState({ ...result, profileId, error: "" }); return true; }
    catch (error) { setState((current) => ({ ...current, error: (error as Error).message })); return false; }
  }
  const current = profileId && state.profileId === profileId;
  return <Context.Provider value={{ orders: current ? state.orders : [], unreadCount: current ? state.unreadCount : 0, error: current ? state.error : "", loading: !!profileId && !current, refresh, markRead }}>{children}</Context.Provider>;
}
export function useIncomingOrders() { const value = useContext(Context); if (!value) throw new Error("Incoming orders provider missing"); return value; }
