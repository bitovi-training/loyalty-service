import { IsString, IsNumber, Min, IsDateString } from "class-validator";

export class RedemptionResponseDto {
  @IsString()
  redemptionId!: string;

  @IsString()
  userId!: string;

  @IsNumber()
  @Min(1)
  points!: number;

  @IsDateString()
  timestamp!: string;

  @IsNumber()
  @Min(0)
  newBalance!: number;
}
