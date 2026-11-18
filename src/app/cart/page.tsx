import type { Metadata } from "next";
import MarketplacePage from "@/components/marketplace-page";

export const metadata: Metadata = { title: "Demo cart" };
export default function Cart() { return <MarketplacePage page="cart" />; }
