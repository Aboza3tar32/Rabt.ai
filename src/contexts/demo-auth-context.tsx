"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import type { DemoActivity, DemoProfile, DemoAccountType, RegistrationDraft } from "@/types/demo-auth";

type AuthResult = { activeProfile: DemoProfile | null; profiles: DemoProfile[] };
type Value = AuthResult & {
  hydrated: boolean; activity: DemoActivity[];
  registerProfile: (type: DemoAccountType, draft: RegistrationDraft, password: string) => Promise<DemoProfile>;
  login: (email: string, password: string) => Promise<void>;
  loginWithDemoAccount: (type: DemoAccountType) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (profile: DemoProfile) => Promise<void>;
  recordActivity: (id: string, action: DemoActivity["action"]) => void;
};
const Context = createContext<Value | null>(null);
export function DemoAuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthResult>({ activeProfile: null, profiles: [] });
  const [hydrated, setHydrated] = useState(false);
  const [activity, setActivity] = useState<DemoActivity[]>([]);
  useEffect(() => {
    api<AuthResult>("auth").then(setState).catch(() => {}).finally(() => setHydrated(true));
  }, []);
  const recordActivity = useCallback((profileId: string, action: DemoActivity["action"]) => {
    setActivity((current) => [{ id: crypto.randomUUID(), profileId, action, occurredAt: new Date().toISOString() }, ...current].slice(0, 30));
  }, []);
  async function registerProfile(type: DemoAccountType, draft: RegistrationDraft, password: string) {
    const result = await api<AuthResult>("auth", "POST", { ...draft, action: "register", type, password, consent: true });
    setState(result); recordActivity(result.activeProfile!.id, "register"); return result.activeProfile!;
  }
  async function login(email: string, password: string) { const result = await api<AuthResult>("auth", "POST", { action: "login", email, password }); setState(result); }
  async function loginWithDemoAccount(type: DemoAccountType) { setState(await api<AuthResult>("auth", "POST", { action: "demo", type })); }
  async function logout() { await api("auth", "DELETE"); setState((current) => ({ ...current, activeProfile: null })); router.push("/"); router.refresh(); }
  async function updateProfile(profile: DemoProfile) { setState(await api<AuthResult>("auth", "PATCH", profile)); }
  return <Context.Provider value={{ ...state, hydrated, activity, registerProfile, login, loginWithDemoAccount, logout, updateProfile, recordActivity }}>{children}</Context.Provider>;
}
export function useDemoAuth() { const value = useContext(Context); if (!value) throw new Error("Auth provider missing"); return value; }
