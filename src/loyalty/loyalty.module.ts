import { Module } from '@nestjs/common';
import { RedemptionRepository } from './repositories/redemption.repository';
import { LoyaltyService } from './loyalty.service';
import { LoyaltyController } from './loyalty.controller';
import { OrderClient } from '../clients/order-client';
import { UserClient } from '../clients/user-client';

@Module({
  providers: [
    RedemptionRepository,
    LoyaltyService,
    OrderClient,
    UserClient,
  ],
  controllers: [LoyaltyController],
  exports: [RedemptionRepository, LoyaltyService, OrderClient, UserClient],
})
export class LoyaltyModule {}
