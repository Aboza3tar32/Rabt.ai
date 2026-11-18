import messages from "./messages.json";
import samples from "./sample-content.json";
import type { Language } from "@/types/marketplace";
import { products, services, stores } from "@/data/marketplace";

const catalog = Object.fromEntries([
  ...products.flatMap((product) => [[product.nameAr, product.nameEn], [product.descriptionAr, product.descriptionEn]]),
  ...services.flatMap((service) => [[service.titleAr, service.titleEn], [service.descriptionAr, service.descriptionEn]]),
  ...stores.map((store) => [store.descriptionAr, store.descriptionEn]),
]);
const english: Record<string, string> = { ...catalog, ...messages, ...samples };
const arabic = Object.fromEntries(Object.entries(english).map(([ar, en]) => [en, ar]));
// Only authored interface/sample content is translated. Unknown member content is preserved.
export function translateContent(language: Language, source: string, ...values: (string | number)[]): string {
  const translated = language === "en" ? english[source] ?? source : arabic[source] ?? source;
  return translated.replace(/\{(\d+)\}/g, (match, index: string) => {
    const value = values[Number(index)];
    if (value === undefined) return match;
    return typeof value === "string" ? (language === "en" ? english[value] ?? value : arabic[value] ?? value) : String(value);
  });
}
