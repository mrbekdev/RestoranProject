import { IsInt, IsString, IsEnum, IsArray, ValidateNested, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '@prisma/client';

export class selectTable {
  @IsInt()
  @Min(1)
  tableId: number;


}