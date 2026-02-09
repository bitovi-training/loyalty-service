import { Injectable } from "@nestjs/common";
import { Redemption } from "../entities/redemption.entity";

@Injectable()
export class RedemptionRepository {
  // Map: userId -> Redemption[]
  private redemptionsByUser: Map<string, Redemption[]> = new Map();

  findByUserId(userId: string): Redemption[] {
    return this.redemptionsByUser.get(userId) || [];
  }

  save(redemption: Redemption): void {
    const userRedemptions = this.redemptionsByUser.get(redemption.userId) || [];
    userRedemptions.push(redemption);
    this.redemptionsByUser.set(redemption.userId, userRedemptions);
  }
}
