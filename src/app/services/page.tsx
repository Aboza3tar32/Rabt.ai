import type { Metadata } from "next";
import MarketplacePage from "@/components/marketplace-page";

export const metadata: Metadata = { title: "Tech services", description: "Explore illustrative digital and technology services." };
export default function Services() { return <MarketplacePage page="services" />; }
