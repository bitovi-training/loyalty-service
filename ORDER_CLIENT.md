# Order Client Usage

## Simple OrderClient

A lightweight HTTP client for communicating with the Order Service.

### Location

`src/clients/order-client.ts`

### Usage

The `OrderClient` is available as a provider in the `LoyaltyModule`. It's injected into `LoyaltyService` to fetch order data from the Order Service API.

```typescript
import { Injectable } from '@nestjs/common';
import { OrderClient } from '../clients/order-client';

@Injectable()
export class MyService {
  constructor(private readonly orderClient: OrderClient) {}

  async getOrdersForUser(userId: string) {
    // Fetch all orders from the order service
    const orders = await this.orderClient.getOrdersByUserId(userId);
    return orders;
  }

  async getSpecificOrder(orderId: string) {
    // Fetch a specific order
    const order = await this.orderClient.getOrderById(orderId);
    return order;
  }

  async getAllOrders(authToken?: string) {
    // Fetch all orders (with optional auth)
    const response = await this.orderClient.getOrders(authToken);
    return response.orders;
  }
}
```

### Integration with LoyaltyService

The `LoyaltyService` now uses `OrderClient` directly instead of the local `OrderRepository`. It fetches real-time order data from the Order Service to calculate loyalty points based on completed orders (DELIVERED or SHIPPED status).

```typescript
@Injectable()
export class LoyaltyService {
  constructor(
    private readonly orderClient: OrderClient,
    private readonly redemptionRepository: RedemptionRepository,
  ) {}

  async calculateBalance(userId: string) {
    // Fetch orders from Order Service
    const ordersResponse = await this.orderClient.getOrdersByUserId(userId);
    
    // Calculate earned points from completed orders
    const earnedPoints = ordersResponse
      .filter((order) => order.status === 'DELIVERED' || order.status === 'SHIPPED')
      .reduce((sum, order) => sum + (order.accruedLoyaltyPoints || 0), 0);
    
    // ... rest of calculation
  }
}
```

### Available Methods

#### `getOrders(authToken?: string): Promise<OrderListResponse>`
Fetches all orders from the order service.

**Parameters:**
- `authToken` (optional): JWT token for authentication

**Returns:**
```typescript
{
  orders: OrderFromService[],
  total: number
}
```

#### `getOrderById(orderId: string, authToken?: string): Promise<OrderFromService>`
Fetches a specific order by ID.

**Parameters:**
- `orderId`: The order ID to fetch
- `authToken` (optional): JWT token for authentication

**Returns:**
```typescript
{
  id: string,
  products: OrderProduct[],
  totalPrice: number,
  accruedLoyaltyPoints?: number,
  orderDate: string,
  status: string
}
```

#### `getOrdersByUserId(userId: string, authToken?: string): Promise<OrderFromService[]>`
Fetches orders for a specific user.

**Parameters:**
- `userId`: The user ID to filter orders by
- `authToken` (optional): JWT token for authentication

**Returns:** Array of `OrderFromService`

### Configuration

Set the Order Service URL via environment variable:

```bash
ORDER_SERVICE_URL=http://order-service:8100
```

Default: `http://localhost:8100`

### Example: Using in LoyaltyService

The `LoyaltyService` uses the `OrderClient` to fetch order data from the Order Service and calculate loyalty points:

```typescript
@Injectable()
export class LoyaltyService {
  constructor(
    private readonly orderClient: OrderClient,
    private readonly redemptionRepository: RedemptionRepository,
  ) {}

  async calculateBalance(userId: string) {
    // Fetch orders from external Order Service
    const ordersResponse = await this.orderClient.getOrdersByUserId(userId);
    const redemptions = this.redemptionRepository.findByUserId(userId);

    // Calculate earned points from completed/delivered orders
    const earnedPoints = ordersResponse
      .filter((order) => order.status === 'DELIVERED' || order.status === 'SHIPPED')
      .reduce((sum, order) => sum + (order.accruedLoyaltyPoints || 0), 0);

    const redeemedPoints = redemptions.reduce(
      (sum, redemption) => sum + redemption.points,
      0,
    );

    return {
      earnedPoints,
      redeemedPoints,
      balance: earnedPoints - redeemedPoints,
    };
  }
}
```

This means the loyalty service gets **real-time order data** from the Order Service instead of using local stub data.

### Error Handling

The OrderClient logs errors and re-throws them. Wrap calls in try-catch:

```typescript
try {
  const orders = await this.orderClient.getOrders();
} catch (error) {
  // Handle error (already logged by OrderClient)
  console.error('Failed to fetch orders:', error);
}
```

## Testing

The OrderClient can be easily mocked in tests:

```typescript
const mockOrderClient = {
  getOrders: jest.fn(),
  getOrderById: jest.fn(),
  getOrdersByUserId: jest.fn(),
};

const module = await Test.createTestingModule({
  providers: [
    MyService,
    { provide: OrderClient, useValue: mockOrderClient },
  ],
}).compile();
```
