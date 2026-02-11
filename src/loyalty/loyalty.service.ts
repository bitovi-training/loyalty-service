import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { OrderClient } from "../clients/order-client";
import { UserClient } from "../clients/user-client";
import { BalanceResponseDto } from "./dto/balance-response.dto";
import { RedemptionResponseDto } from "./dto/redemption-response.dto";
import { OrderRepository } from "./repositories/order.repository";
import { RedemptionRepository } from "./repositories/redemption.repository";

@Injectable()
export class LoyaltyService {
  // Per-user mutex for concurrency control per research.md Decision 3
  private activeLocks: Map<string, Promise<void>> = new Map();

  constructor(
    private readonly orderClient: OrderClient,
    private readonly userClient: UserClient,
    private readonly orderRepository: OrderRepository,
    private readonly redemptionRepository: RedemptionRepository,
  ) {}

  /**
   * Calculate available balance for a user
   * Balance = SUM(active orders.points) - SUM(redemptions.points)
   */
  async calculateBalance(
    userId: string,
    authToken?: string,
  ): Promise<{
    earnedPoints: number;
    redeemedPoints: number;
    balance: number;
  }> {
    const ordersResponse = await this.orderClient.getOrdersByUserId(
      userId,
      authToken,
    );
    const redemptions = this.redemptionRepository.findByUserId(userId);

    // Calculate earned points from completed/delivered orders
    const earnedPoints = ordersResponse
      .filter(
        (order) => order.status === "DELIVERED" || order.status === "SHIPPED",
      )
      .reduce((sum, order) => sum + (order.accruedLoyaltyPoints || 0), 0);

    const redeemedPoints = redemptions.reduce(
      (sum, redemption) => sum + redemption.points,
      0,
    );

    const balance = earnedPoints - redeemedPoints;

    return { earnedPoints, redeemedPoints, balance };
  }

  /**
   * Get loyalty balance for a user
   */
  async getBalance(
    userId: string,
    authToken?: string,
  ): Promise<BalanceResponseDto> {
    // Validate user exists per research.md Decision 7
    const userExists = await this.userClient.validateUser(userId);
    if (!userExists) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const { earnedPoints, redeemedPoints, balance } =
      await this.calculateBalance(userId, authToken);

    return {
      userId,
      balance,
      earnedPoints,
      redeemedPoints,
    };
  }

  /**
   * Redeem loyalty points for a user
   * Validates sufficient balance and uses mutex for concurrency safety
   */
  async redeemPoints(
    userId: string,
    points: number,
    authToken?: string,
  ): Promise<RedemptionResponseDto> {
    // Wait for any pending operation on this user (per-user mutex)
    const existingLock = this.activeLocks.get(userId);
    if (existingLock) {
      await existingLock.catch(() => {}); // Ignore errors from previous operations
    }

    // Create a new lock for this operation
    let lockResolve: () => void = () => {};
    const lockPromise = new Promise<void>((resolve) => {
      lockResolve = resolve;
    });
    this.activeLocks.set(userId, lockPromise);

    try {
      const result = await this.executeRedemption(userId, points, authToken);
      return result;
    } finally {
      lockResolve(); // Always release lock
      this.activeLocks.delete(userId);
    }
  }

  /**
   * Execute the actual redemption (internal method)
   */
  private async executeRedemption(
    userId: string,
    points: number,
    authToken?: string,
  ): Promise<RedemptionResponseDto> {
    // Validate positive points per research.md Decision 7
    if (points <= 0) {
      throw new BadRequestException("Redemption amount must be positive");
    }

    // Validate user exists
    const userExists = await this.userClient.validateUser(userId);
    if (!userExists) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    // Calculate current balance
    const { balance } = await this.calculateBalance(userId, authToken);

    // Validate sufficient points
    if (balance < points) {
      throw new ConflictException(
        `Insufficient points. Available: ${balance}, Requested: ${points}`,
      );
    }

    // Create redemption record
    const redemption = {
      redemptionId: uuidv4(),
      userId,
      points,
      timestamp: new Date(),
    };

    // Save redemption
    this.redemptionRepository.save(redemption);

    // Calculate new balance
    const newBalance = balance - points;

    // Return response
    return {
      redemptionId: redemption.redemptionId,
      userId: redemption.userId,
      points: redemption.points,
      timestamp: redemption.timestamp.toISOString(),
      newBalance,
    };
  }

  /**
   * Get redemption history for a user
   * Returns redemptions sorted by timestamp (newest first)
   */
  async getRedemptionHistory(userId: string) {
    // Validate user exists
    const userExists = await this.userClient.validateUser(userId);
    if (!userExists) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    // Get redemptions
    const redemptions = this.redemptionRepository.findByUserId(userId);

    // Sort by timestamp descending (newest first) per spec.md FR-016
    const sortedRedemptions = redemptions
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .map((r) => ({
        redemptionId: r.redemptionId,
        userId: r.userId,
        points: r.points,
        timestamp: r.timestamp.toISOString(),
      }));

    return {
      userId,
      redemptions: sortedRedemptions,
    };
  }

  /**
   * Record loyalty points earned for an order
   */
  async accruePoints(
    orderId: string,
    userId: string,
    totalPrice: number,
    authToken?: string,
  ): Promise<{ orderId: string; userId: string; points: number }> {
    if (!orderId) {
      throw new BadRequestException("Order ID is required");
    }

    if (!userId) {
      throw new BadRequestException("User ID is required");
    }

    const userExists = await this.userClient.validateUser(userId);
    if (!userExists) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    try {
      await this.orderClient.getOrderById(orderId, authToken);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      if (error instanceof ForbiddenException) {
        throw error;
      }

      if (error instanceof NotFoundException) {
        throw new NotFoundException(`Order ${orderId} not found`);
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException("Invalid order ID");
    }

    if (totalPrice < 0) {
      throw new BadRequestException("Total price must be non-negative");
    }

    const points = Math.floor(totalPrice / 10);

    this.orderRepository.save({
      orderId,
      userId,
      points,
      status: "active",
    });

    return { orderId, userId, points };
  }
}
