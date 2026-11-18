import type { Metadata } from "next";
import MarketplacePage from "@/components/marketplace-page";

export const metadata: Metadata = { title: "Store details", description: "Explore an illustrative store profile and its demo listings." };
export default async function StoreDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MarketplacePage page="store" id={id} />;
}
