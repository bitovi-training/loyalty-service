export type OrderStatus = "active" | "cancelled" | "refunded";

export interface Order {
  orderId: string; // Unique order identifier
  userId: string; // User who placed the order
  points: number; // Points earned from this order (integer, >= 0)
  status: OrderStatus; // Order state
}
