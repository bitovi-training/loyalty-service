import { IsNumber, Min } from "class-validator";

export class RedeemRequestDto {
  @IsNumber()
  @Min(1)
  points!: number;
}
