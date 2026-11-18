import { translateContent } from "@/i18n/content";
import type { Language } from "@/types/marketplace";

export type DemoAccountType = "individual" | "business";

export type DemoProfileBase = {
  id: string;
  type: DemoAccountType;
  email: string;
  phone: string;
  city: string;
  avatar?: string;
  createdAt: string;
};

export type IndividualDemoProfile = DemoProfileBase & {
  type: "individual";
  fullName: string;
};

export type BusinessDemoProfile = DemoProfileBase & {
  type: "business";
  businessNameAr: string;
  businessNameEn: string;
  address: string;
  category: string;
  description: string;
};

export type DemoProfile = IndividualDemoProfile | BusinessDemoProfile;

export type DemoActivity = {
  id: string;
  profileId: string;
  action: "login" | "register" | "listing-added" | "listing-updated" | "listing-removed" | "profile-updated";
  occurredAt: string;
};

export type DemoAuthState = {
  profiles: DemoProfile[];
  activeProfileId: string | null;
  activity: DemoActivity[];
};

export type RegistrationDraft = Omit<IndividualDemoProfile, "id" | "type" | "createdAt"> |
  Omit<BusinessDemoProfile, "id" | "type" | "createdAt">;

export function profileDisplayName(profile: DemoProfile, language: Language): string {
  if (profile.type === "individual") return translateContent(language, profile.fullName);
  return translateContent(language, language === "ar" ? profile.businessNameAr : profile.businessNameEn);
}
