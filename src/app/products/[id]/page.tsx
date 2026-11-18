import type { Metadata } from "next";
import MarketplacePage from "@/components/marketplace-page";

export const metadata: Metadata = { title: "Product details", description: "Illustrative product details in the RABT.AI marketplace demo." };
export default async function ProductDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MarketplacePage page="product" id={id} />;
}
