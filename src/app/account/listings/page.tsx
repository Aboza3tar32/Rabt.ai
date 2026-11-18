import type { Metadata } from "next";
import MarketplacePage from "@/components/marketplace-page";

export const metadata: Metadata = { title: "My listings" };
export default function AccountListings() { return <MarketplacePage page="account-listings" />; }
