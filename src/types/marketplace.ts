export type Language = "ar" | "en";
export type Condition = "new" | "used";
export type SellerType = "store" | "individual";

export type Product = {
  id: string;
  image?: string;
  modelId: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  priceJod: number;
  category: string;
  condition: Condition;
  sellerType: SellerType;
  sellerId: string;
  city: string;
  icon: string;
  accent: string;
  specifications: Record<string, string>;
  featured: boolean;
  createdAt: string;
};

export type Store = {
  id: string;
  name: string;
  city: string;
  descriptionAr: string;
  descriptionEn: string;
  mark: string;
};

export type Service = {
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  category: string;
  price: number;
  provider: string;
  providerId?: string;
  delivery: string;
};

export type LocalListing = {
  id: string;
  image?: string;
  ownerId?: string;
  title: string;
  titleAr?: string;
  titleEn?: string;
  description: string;
  category: string;
  price: number;
  city: string;
  condition: Condition;
  sellerType: SellerType;
  kind: "product" | "service";
  createdAt: string;
  delivery?: string;
};
