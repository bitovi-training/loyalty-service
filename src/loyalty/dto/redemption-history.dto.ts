import { IsArray, IsNumber, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class RedemptionRecordDto {
  @IsString()
  redemptionId!: string;

  @IsString()
  userId!: string;

  @IsNumber()
  points!: number;

  @IsString()
  timestamp!: string;
}

export class RedemptionHistoryResponseDto {
  @IsString()
  userId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RedemptionRecordDto)
  redemptions!: RedemptionRecordDto[];
}
