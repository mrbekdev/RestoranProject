import { PartialType } from '@nestjs/swagger';
import { CreatePercentDto } from './create-percent.dto';

export class UpdatePercentDto extends PartialType(CreatePercentDto) {}
