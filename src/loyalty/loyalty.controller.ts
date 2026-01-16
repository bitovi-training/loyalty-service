import { Controller, Get, Post, Param, Body, HttpCode, Headers } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';
import { BalanceResponseDto } from './dto/balance-response.dto';
import { RedeemRequestDto } from './dto/redeem-request.dto';
import { RedemptionResponseDto } from './dto/redemption-response.dto';
import { RedemptionHistoryResponseDto } from './dto/redemption-history.dto';

@Controller('loyalty/:userId')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  /**
   * GET /loyalty/:userId/balance
   * Get loyalty points balance for a user
   */
  @Get('balance')
  async getBalance(
    @Param('userId') userId: string,
    @Headers('authorization') authorization?: string,
  ): Promise<BalanceResponseDto> {
    const authToken = this.extractToken(authorization);
    return this.loyaltyService.getBalance(userId, authToken);
  }

  /**
   * POST /loyalty/:userId/redeem
   * Redeem loyalty points for a user
   */
  @Post('redeem')
  @HttpCode(201)
  async redeemPoints(
    @Param('userId') userId: string,
    @Body() redeemRequest: RedeemRequestDto,
    @Headers('authorization') authorization?: string,
  ): Promise<RedemptionResponseDto> {
    const authToken = this.extractToken(authorization);
    return this.loyaltyService.redeemPoints(userId, redeemRequest.points, authToken);
  }

  /**
   * Extract token from Authorization header
   */
  private extractToken(authorization?: string): string | undefined {
    if (!authorization) return undefined;
    const parts = authorization.split(' ');
    return parts.length === 2 && parts[0] === 'Bearer' ? parts[1] : undefined;
  }

  /**
   * GET /loyalty/:userId/redemptions
   * Get redemption history for a user
   */
  @Get('redemptions')
  async getRedemptionHistory(
    @Param('userId') userId: string,
  ): Promise<RedemptionHistoryResponseDto> {
    return this.loyaltyService.getRedemptionHistory(userId);
  }
}
