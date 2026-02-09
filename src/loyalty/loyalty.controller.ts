import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
} from "@nestjs/common";
import { LoyaltyService } from "./loyalty.service";
import { BalanceResponseDto } from "./dto/balance-response.dto";
import { RedeemRequestDto } from "./dto/redeem-request.dto";
import { RedemptionResponseDto } from "./dto/redemption-response.dto";
import { RedemptionHistoryResponseDto } from "./dto/redemption-history.dto";

@Controller("loyalty")
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  /**
   * GET /loyalty/:userId/balance
   * Get loyalty points balance for a user
   */
  @Get(":userId/balance")
  async getBalance(
    @Param("userId") userId: string,
    @Headers("authorization") authorization?: string,
  ): Promise<BalanceResponseDto> {
    const authToken = this.extractToken(authorization);
    return this.loyaltyService.getBalance(userId, authToken);
  }

  /**
   * POST /loyalty/:userId/redeem
   * Redeem loyalty points for a user
   */
  @Post(":userId/redeem")
  @HttpCode(201)
  async redeemPoints(
    @Param("userId") userId: string,
    @Body() redeemRequest: RedeemRequestDto,
    @Headers("authorization") authorization?: string,
  ): Promise<RedemptionResponseDto> {
    const authToken = this.extractToken(authorization);
    return this.loyaltyService.redeemPoints(
      userId,
      redeemRequest.points,
      authToken,
    );
  }

  /**
   * Extract token from Authorization header
   */
  private extractToken(authorization?: string): string | undefined {
    if (!authorization) return undefined;
    const parts = authorization.split(" ");
    return parts.length === 2 && parts[0] === "Bearer" ? parts[1] : undefined;
  }

  /**
   * GET /loyalty/:userId/redemptions
   * Get redemption history for a user
   */
  @Get(":userId/redemptions")
  async getRedemptionHistory(
    @Param("userId") userId: string,
  ): Promise<RedemptionHistoryResponseDto> {
    return this.loyaltyService.getRedemptionHistory(userId);
  }

  /**
   * POST /loyalty/orders
   * Record loyalty points for an order submission
   */
  @Post("/orders")
  @HttpCode(201)
  async accrueOrderPoints(
    @Body()
    body: {
      orderId: string;
      userId: string;
      totalPrice: number;
    },
  ): Promise<{ orderId: string; userId: string; points: number }> {
    return this.loyaltyService.accruePoints(
      body.orderId,
      body.userId,
      body.totalPrice,
    );
  }
}
