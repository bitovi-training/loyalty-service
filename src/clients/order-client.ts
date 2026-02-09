import { Injectable, Logger } from "@nestjs/common";

export interface OrderProduct {
  productId: string;
  quantity: number;
}

export interface OrderFromService {
  id: string;
  userId: string;
  products: OrderProduct[];
  totalPrice: number;
  accruedLoyaltyPoints?: number;
  orderDate: string;
  status: string;
}

export interface OrderListResponse {
  orders: OrderFromService[];
  total: number;
}

/**
 * Simple HTTP client for communicating with the Order Service
 */
@Injectable()
export class OrderClient {
  private readonly logger = new Logger(OrderClient.name);
  private readonly orderServiceUrl: string;

  constructor() {
    this.orderServiceUrl =
      process.env.ORDER_SERVICE_URL || "http://localhost:8100";
    this.logger.log(
      `OrderClient initialized with URL: ${this.orderServiceUrl}`,
    );
  }

  /**
   * Fetch all orders from the order service
   */
  async getOrders(authToken?: string): Promise<OrderListResponse> {
    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${this.orderServiceUrl}/orders`, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.statusText}`);
      }

      return (await response.json()) as OrderListResponse;
    } catch (error) {
      this.logger.error("Error fetching orders from order service:", error);
      throw error;
    }
  }

  /**
   * Get a specific order by ID
   */
  async getOrderById(
    orderId: string,
    authToken?: string,
  ): Promise<OrderFromService> {
    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const response = await fetch(
        `${this.orderServiceUrl}/orders/${orderId}`,
        {
          method: "GET",
          headers,
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch order: ${response.statusText}`);
      }

      return (await response.json()) as OrderFromService;
    } catch (error) {
      this.logger.error(`Error fetching order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Get orders for a specific user (filters locally after fetching all)
   */
  async getOrdersByUserId(
    userId: string,
    authToken?: string,
  ): Promise<OrderFromService[]> {
    try {
      const response = await this.getOrders(authToken);
      // Note: This assumes all orders are returned. In production,
      // you might want to add a query parameter to filter by userId on the server
      return response.orders.filter((order) => order.userId === userId);
    } catch (error) {
      this.logger.error(`Error fetching orders for user ${userId}:`, error);
      throw error;
    }
  }
}
