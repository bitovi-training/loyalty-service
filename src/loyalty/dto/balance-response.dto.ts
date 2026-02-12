import { IsString, IsNumber, Min } from "class-validator";

export class BalanceResponseDto {
  @IsString()
  userId!: string;

  @IsNumber()
  @Min(0)
  balance!: number;

  @IsNumber()
  @Min(0)
  earnedPoints!: number;

  @IsNumber()
  @Min(0)
  redeemedPoints!: number;
}
