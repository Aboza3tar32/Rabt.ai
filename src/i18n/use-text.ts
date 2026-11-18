"use client";
import { useMarketplace } from "@/contexts/marketplace-context";
import { translateContent } from "@/i18n/content";

export function useText() {
  const { language } = useMarketplace();
  return (source: string, ...values: (string | number)[]) => translateContent(language, source, ...values);
}
