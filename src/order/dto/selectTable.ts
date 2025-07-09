import { IsInt, Min } from 'class-validator';

export class SelectTableDto {
  @IsInt()
  @Min(1)
  tableId: number;
}