import { IsInt, IsString, IsEnum, IsArray, ValidateNested, Min, IsOptional } from 'class-validator';
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

export class UpdateOrderDto {
  @IsString()
  @IsOptional()
  tableNumber?: string;

  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @IsInt()
  @IsOptional()
  userId?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderProductDto)
  @IsOptional()
  products?: OrderProductDto[];
}