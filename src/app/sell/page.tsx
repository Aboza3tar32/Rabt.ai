import type { Metadata } from "next";
import MarketplacePage from "@/components/marketplace-page";

export const metadata: Metadata = { title: "Post a listing" };
export default function Sell() { return <MarketplacePage page="sell" />; }
