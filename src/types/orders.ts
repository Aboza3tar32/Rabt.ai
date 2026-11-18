export type OrderItem = { id: string; title: string; titleEn?: string; quantity: number; price: number; sellerId?: string };
export type Order = {
  id: string; ownerId: string; fullName: string; email: string; phone: string;
  items: OrderItem[]; total: number; status: "pending"; createdAt: string;
  sellerReadAt?: Record<string, string>;
};
export type IncomingOrder = {
  id: string; fullName: string; email: string; phone: string;
  items: OrderItem[]; total: number; createdAt: string; readAt: string | null;
};
export type IncomingOrdersResult = { orders: IncomingOrder[]; unreadCount: number };
