import { Transform } from 'class-transformer';
import { IsString, IsNumber, IsOptional, IsInt, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  name: string;


  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  price: number;

  @IsOptional()
  @IsString()
  image?: string;
  @IsString()
  @IsOptional()
  date:string;

  @Transform(({ value }) => value ? parseInt(value, 10) : null)
  @IsOptional()
  categoryId?: number;
}