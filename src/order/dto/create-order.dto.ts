import { IsInt, IsNotEmpty, IsString, IsEnum, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '@prisma/client';

class OrderProductDto {
  @IsInt()
  @Min(1)
  productId: number;

  @IsInt()
  @Min(1)
  count: number;
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  tableNumber: string;

  @IsEnum(OrderStatus)
  status: OrderStatus;

  @IsInt()
  userId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderProductDto)
  products: OrderProductDto[];
}