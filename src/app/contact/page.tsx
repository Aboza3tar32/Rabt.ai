import type { Metadata } from "next";
import MarketplacePage from "@/components/marketplace-page";

export const metadata: Metadata = { title: "Contact RABT.AI | تواصل معنا" };
export default function Contact() { return <MarketplacePage page="contact" />; }
