import { IsInt, IsString, IsArray, ValidateNested, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

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

export class CreateOrderDto {
  @IsOptional()
  @IsInt()
  userId?: number;

  @IsOptional()
  @IsInt()
  tableId?: number;

  @IsOptional()
  @IsString()
  carrierNumber?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderProductDto)
  products: OrderProductDto[];

  @IsOptional()
  @IsInt()
  uslug?: number;
}