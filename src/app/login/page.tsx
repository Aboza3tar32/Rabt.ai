import type { Metadata } from "next";
import MarketplacePage from "@/components/marketplace-page";

export const metadata: Metadata = { title: "Demo login" };
export default function Login() { return <MarketplacePage page="login" />; }
