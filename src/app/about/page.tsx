import type { Metadata } from "next";
import MarketplacePage from "@/components/marketplace-page";

export const metadata: Metadata = { title: "About RABT.AI" };
export default function About() { return <MarketplacePage page="about" />; }
