import type { Metadata } from "next";
import MarketplacePage from "@/components/marketplace-page";

export const metadata: Metadata = { title: "Favorites" };
export default function Favorites() { return <MarketplacePage page="favorites" />; }
