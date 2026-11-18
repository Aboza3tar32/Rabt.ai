import type { Metadata } from "next";
import MarketplacePage from "@/components/marketplace-page";

export const metadata: Metadata = { title: "Order preview" };
export default function Checkout() { return <MarketplacePage page="checkout" />; }
