import type { Metadata } from "next";
import MarketplacePage from "@/components/marketplace-page";

export const metadata: Metadata = { title: "Stores", description: "Browse fictional technology stores in the RABT.AI demo." };
export default function Stores() { return <MarketplacePage page="stores" />; }
