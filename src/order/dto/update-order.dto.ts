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

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateOrderDto {
  @IsOptional()
  @IsInt()
  tableId?: number;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsInt()
  userId?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderProductDto)
  products?: OrderProductDto[];

  @IsOptional()
  @IsInt()
  totalPrice?: number;

  @IsOptional()
  @IsString()
  carrierNumber?: string;

  @IsOptional()
  @IsInt()
  uslug?: number;
}