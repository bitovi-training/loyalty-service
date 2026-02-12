import { Module } from "@nestjs/common";
import { LoyaltyModule } from "./loyalty/loyalty.module";

@Module({
  imports: [LoyaltyModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
