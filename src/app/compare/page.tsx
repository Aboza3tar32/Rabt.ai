import type { Metadata } from "next";
import MarketplacePage from "@/components/marketplace-page";

export const metadata: Metadata = { title: "Product comparison" };
export default function Compare() { return <MarketplacePage page="compare" />; }
