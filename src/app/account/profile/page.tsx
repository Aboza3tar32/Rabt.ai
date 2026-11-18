import type { Metadata } from "next";
import MarketplacePage from "@/components/marketplace-page";

export const metadata: Metadata = { title: "Profile settings" };
export default function AccountProfile() { return <MarketplacePage page="account-profile" />; }
