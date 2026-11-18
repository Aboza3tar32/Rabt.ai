import type { Metadata } from "next";
import MarketplacePage from "@/components/marketplace-page";

export const metadata: Metadata = { title: "Demo registration" };
export default function Register() { return <MarketplacePage page="register" />; }
