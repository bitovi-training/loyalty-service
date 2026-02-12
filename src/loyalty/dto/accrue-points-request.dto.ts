import { IsNotEmpty, IsNumber, IsUUID, Min } from "class-validator";

export class AccruePointsRequestDto {
  @IsUUID()
  @IsNotEmpty()
  orderId!: string;

  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @IsNumber()
  @Min(0)
  totalPrice!: number;
}
