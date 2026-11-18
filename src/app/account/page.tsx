import type { Metadata } from "next";
import MarketplacePage from "@/components/marketplace-page";

export const metadata: Metadata = { title: "Demo account" };
export default function Account() { return <MarketplacePage page="account" />; }
