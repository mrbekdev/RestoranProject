// update-table.dto.ts
import { IsString, IsOptional } from 'class-validator';
import { TableStatus } from '@prisma/client';

export class UpdateTableDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  number?: string;

  @IsOptional()
  status?: TableStatus;
}