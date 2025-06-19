// create-table.dto.ts
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { TableStatus } from '@prisma/client';

export class CreateTableDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  number: string;

  @IsOptional()
  status?: TableStatus;
}