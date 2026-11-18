import type { Metadata } from "next";
import MarketplacePage from "@/components/marketplace-page";

export const metadata: Metadata = { title: "Account settings" };
export default function AccountSettings() { return <MarketplacePage page="account-settings" />; }
