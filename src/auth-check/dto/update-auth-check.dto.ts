import { PartialType } from '@nestjs/swagger';
import { CreateAuthCheckDto } from './create-auth-check.dto';

export class UpdateAuthCheckDto extends PartialType(CreateAuthCheckDto) {}
