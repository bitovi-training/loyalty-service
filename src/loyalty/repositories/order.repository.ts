import { Injectable } from '@nestjs/common';
import { Order } from '../entities/order.entity';

@Injectable()
export class OrderRepository {
  private ordersByUser: Map<string, Order[]> = new Map();

  findByUserId(userId: string): Order[] {
    return this.ordersByUser.get(userId) || [];
  }

  save(order: Order): void {
    const orders = this.ordersByUser.get(order.userId) || [];
    const existingIndex = orders.findIndex((o) => o.orderId === order.orderId);
    if (existingIndex >= 0) {
      orders[existingIndex] = order;
    } else {
      orders.push(order);
    }
    this.ordersByUser.set(order.userId, orders);
  }

  hasUser(userId: string): boolean {
    return this.ordersByUser.has(userId);
  }
}