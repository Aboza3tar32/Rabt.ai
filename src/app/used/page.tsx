import type { Metadata } from "next";
import MarketplacePage from "@/components/marketplace-page";

export const metadata: Metadata = { title: "Used market", description: "Explore illustrative pre-owned technology listings." };
export default function Used() { return <MarketplacePage page="used" />; }
