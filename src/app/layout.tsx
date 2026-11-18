import type { Metadata } from "next";
import "./globals.css";
import { MarketplaceProvider } from "@/contexts/marketplace-context";
import { DemoAuthProvider } from "@/contexts/demo-auth-context";
import { IncomingOrdersProvider } from "@/contexts/incoming-orders-context";

export const metadata: Metadata = {
  title: {
    default: "RABT.AI | سوق الأردن للمنتجات التقنية والخدمات الرقمية",
    template: "%s | RABT.AI",
  },
  icons: { icon: "/icon.svg", apple: "/brand-mark.svg" },
  description: "سوق الأردن للمنتجات التقنية والخدمات الرقمية — رابط يجمعنا.",
  openGraph: {
    title: "RABT.AI",
    description: "سوق الأردن للمنتجات التقنية والخدمات الرقمية",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className="h-full antialiased">
      <body className="min-h-full">
        <DemoAuthProvider><MarketplaceProvider><IncomingOrdersProvider>{children}</IncomingOrdersProvider></MarketplaceProvider></DemoAuthProvider>
      </body>
    </html>
  );
}
