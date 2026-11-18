import type { Metadata } from "next";
import MarketplacePage from "@/components/marketplace-page";

export const metadata: Metadata = { title: "How it works" };
export default function HowItWorks() { return <MarketplacePage page="how" />; }
