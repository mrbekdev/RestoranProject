import { IsString, IsOptional } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  description?: string;
}