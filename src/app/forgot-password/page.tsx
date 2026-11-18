import type { Metadata } from "next";
import MarketplacePage from "@/components/marketplace-page";

export const metadata: Metadata = { title: "Password recovery demo" };
export default function ForgotPassword() { return <MarketplacePage page="forgot-password" />; }
