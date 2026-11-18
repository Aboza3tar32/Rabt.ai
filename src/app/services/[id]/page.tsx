import type { Metadata } from "next";
import MarketplacePage from "@/components/marketplace-page";

export const metadata: Metadata = { title: "Service details", description: "Explore an illustrative technical service listing." };
export default async function ServiceDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MarketplacePage page="service" id={id} />;
}
