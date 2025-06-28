import { IsBoolean, IsOptional } from 'class-validator';

export class CreateAuthCheckDto {
  @IsBoolean()
  status: boolean | string;
}

export class UpdateAuthCheckDto {
  @IsBoolean()
  @IsOptional()
  status?: boolean | string;
}