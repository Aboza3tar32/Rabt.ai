import type { Metadata } from "next";
import MarketplacePage from "@/components/marketplace-page";

export const metadata: Metadata = { title: "Products", description: "Explore illustrative technology products in the RABT.AI demo marketplace." };
export default function Products() { return <MarketplacePage page="products" />; }
